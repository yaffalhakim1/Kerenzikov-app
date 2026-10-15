//! Daemon-owned materialization of client-uploaded attachments.

use std::collections::{HashMap, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write as _};
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};

use base64::Engine as _;
use parking_lot::Mutex;
use uuid::Uuid;

pub use waku_protocol::attachments::{
    ATTACHMENT_SCHEME, AttachmentUpload, AttachmentUploadEntry, MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENT_FILES, StoredAttachment,
};

/// How many chunked uploads one daemon stages at a time.
///
/// Every in-flight upload owns a staging directory, so an unbounded registry
/// would let a client make the daemon allocate directories without limit. The
/// cap is deliberately small: a client streams one attachment at a time, and
/// the overflow is refused rather than queued.
pub const MAX_CONCURRENT_ATTACHMENT_UPLOADS: usize = 4;

/// How long a chunked upload may go untouched before its staged bytes are
/// reclaimed.
///
/// [`AttachmentStore::retain_with_cutoff`] skips `.{uuid}.tmp` staging
/// directories on purpose, so an upload whose client died mid-stream is
/// otherwise never cleaned up by anything.
pub const ATTACHMENT_UPLOAD_IDLE_DEADLINE: Duration = Duration::from_secs(5 * 60);

pub struct AttachmentStore {
    root: PathBuf,
    /// Chunked uploads in flight, keyed by the id the client was given.
    ///
    /// Shared because the daemon dispatches each request on its own thread.
    /// The map is only held long enough to resolve an upload; the bytes of one
    /// upload are serialized by that upload's own lock, so two clients
    /// streaming concurrently do not queue behind each other's disk writes.
    uploads: Mutex<HashMap<Uuid, Arc<PendingUpload>>>,
}

/// One chunked upload the daemon is staging.
struct PendingUpload {
    name: String,
    total_bytes: u64,
    staging: PathBuf,
    state: Mutex<PendingUploadState>,
}

struct PendingUploadState {
    received: u64,
    last_touch: Instant,
    /// Set by `finish`/`abort`/expiry once the upload leaves the registry. A
    /// chunk that resolved this upload just before that removal must not write
    /// into a staging path that has already been renamed or deleted.
    closed: bool,
}

impl AttachmentStore {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            uploads: Mutex::new(HashMap::new()),
        }
    }

    /// Starts a chunked upload and returns the id its chunks are addressed by.
    ///
    /// The declared size is validated here so a client cannot stage bytes it
    /// would never be allowed to commit, and stale uploads are reclaimed first
    /// so a dead client's staging directory does not hold a slot forever.
    pub fn begin_upload(&self, name: &str, total_bytes: u64) -> io::Result<Uuid> {
        let name = safe_name(name)?;
        let declared = usize::try_from(total_bytes).map_err(|_| oversized_attachment())?;
        ensure_size(declared)?;
        self.expire_idle_uploads(Instant::now())?;
        let id = Uuid::new_v4();
        let staging = self.root.join(staging_name(id));
        let mut uploads = self.uploads.lock();
        if uploads.len() >= MAX_CONCURRENT_ATTACHMENT_UPLOADS {
            return Err(io::Error::other(
                "too many attachment uploads are already in progress",
            ));
        }
        fs::create_dir_all(&staging)?;
        File::create(staging.join(&name))?;
        uploads.insert(
            id,
            Arc::new(PendingUpload {
                name,
                total_bytes,
                staging,
                state: Mutex::new(PendingUploadState {
                    received: 0,
                    last_touch: Instant::now(),
                    closed: false,
                }),
            }),
        );
        Ok(id)
    }

    /// Appends one sequential chunk.
    ///
    /// `offset` must equal the bytes already received, so a gap, an overlap or
    /// a replay is refused instead of silently corrupting the file.
    pub fn append_upload(&self, upload_id: Uuid, offset: u64, data: &[u8]) -> io::Result<()> {
        let upload = self
            .uploads
            .lock()
            .get(&upload_id)
            .cloned()
            .ok_or_else(unknown_upload)?;
        let mut state = upload.state.lock();
        if state.closed {
            return Err(unknown_upload());
        }
        if offset != state.received {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "attachment chunk offset does not continue the bytes already received",
            ));
        }
        let received = state.received.checked_add(data.len() as u64).ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "attachment is larger than 32 MB",
            )
        })?;
        ensure_size(usize::try_from(received).map_err(|_| oversized_attachment())?)?;
        let mut file = OpenOptions::new()
            .append(true)
            .open(upload.staging.join(&upload.name))?;
        file.write_all(data)?;
        state.received = received;
        state.last_touch = Instant::now();
        Ok(())
    }

    /// Commits an upload: the staged bytes become a stored attachment.
    ///
    /// The received count has to match the declared total, so a truncated
    /// stream cannot be committed as if it were the whole file.
    pub fn finish_upload(&self, upload_id: Uuid) -> io::Result<StoredAttachment> {
        let upload = self
            .uploads
            .lock()
            .remove(&upload_id)
            .ok_or_else(unknown_upload)?;
        let mut state = upload.state.lock();
        state.closed = true;
        if state.received != upload.total_bytes {
            let _ = fs::remove_dir_all(&upload.staging);
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "attachment upload is incomplete: the received bytes do not match the declared total",
            ));
        }
        drop(state);
        let destination = self.root.join(upload_id.to_string());
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
        }
        if let Err(error) = fs::rename(&upload.staging, &destination) {
            let _ = fs::remove_dir_all(&upload.staging);
            return Err(error);
        }
        Ok(StoredAttachment {
            reference: format!("{ATTACHMENT_SCHEME}{upload_id}"),
            path: destination.join(&upload.name),
            name: upload.name.clone(),
            is_dir: false,
        })
    }

    /// Discards an upload and its staged bytes.
    ///
    /// Aborting an upload the daemon no longer holds succeeds: it is already
    /// discarded, so a client cleaning up after a failed transfer never has to
    /// special-case an id the daemon reclaimed on its own.
    pub fn abort_upload(&self, upload_id: Uuid) -> io::Result<()> {
        let Some(upload) = self.uploads.lock().remove(&upload_id) else {
            return Ok(());
        };
        let mut state = upload.state.lock();
        state.closed = true;
        drop(state);
        match fs::remove_dir_all(&upload.staging) {
            Err(error) if error.kind() != io::ErrorKind::NotFound => Err(error),
            _ => Ok(()),
        }
    }

    /// Reclaims uploads whose client stopped streaming, returning the bytes
    /// their staging directories held.
    pub fn sweep_idle_uploads(&self) -> io::Result<u64> {
        self.expire_idle_uploads(Instant::now())
    }

    fn expire_idle_uploads(&self, now: Instant) -> io::Result<u64> {
        // The stale uploads are removed from the registry under the lock, but
        // their directories are deleted after it is released: the sweeper runs
        // on its own thread while clients are streaming, and deleting a
        // directory under the map lock would stall every chunk append behind
        // it.
        let stale: Vec<Arc<PendingUpload>> = {
            let mut uploads = self.uploads.lock();
            let ids: Vec<Uuid> = uploads
                .iter()
                .filter(|(_, upload)| {
                    let state = upload.state.lock();
                    !state.closed
                        && now.duration_since(state.last_touch) >= ATTACHMENT_UPLOAD_IDLE_DEADLINE
                })
                .map(|(id, _)| *id)
                .collect();
            ids.into_iter()
                .filter_map(|id| {
                    let upload = uploads.remove(&id)?;
                    // Claim it before the lock drops, so a chunk that already
                    // resolved this upload cannot write into a staging path
                    // about to be deleted.
                    upload.state.lock().closed = true;
                    Some(upload)
                })
                .collect()
        };
        let mut reclaimed = 0;
        for upload in stale {
            reclaimed += directory_size(&upload.staging).unwrap_or_default();
            let _ = fs::remove_dir_all(&upload.staging);
        }
        Ok(reclaimed)
    }

    pub fn import(&self, name: &str, upload: AttachmentUpload) -> io::Result<StoredAttachment> {
        self.materialize(name, |target| match upload {
            AttachmentUpload::File { data_base64 } => {
                let bytes = decode(&data_base64)?;
                ensure_size(bytes.len())?;
                fs::write(target, bytes)?;
                Ok(false)
            }
            AttachmentUpload::Directory { entries } => {
                if entries.len() > MAX_ATTACHMENT_FILES {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "attachment directory contains too many files",
                    ));
                }
                fs::create_dir_all(target)?;
                let mut total_bytes = 0usize;
                for entry in entries {
                    let relative = safe_relative_path(&entry.relative_path)?;
                    let bytes = decode(&entry.data_base64)?;
                    total_bytes = total_bytes.checked_add(bytes.len()).ok_or_else(|| {
                        io::Error::new(
                            io::ErrorKind::InvalidInput,
                            "attachment directory is too large",
                        )
                    })?;
                    ensure_size(total_bytes)?;
                    let path = target.join(relative);
                    if let Some(parent) = path.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    fs::write(path, bytes)?;
                }
                Ok(true)
            }
        })
    }

    /// Copies an absolute path on the daemon host into the managed attachment
    /// store. The client sends only the path; file bytes never cross the RPC.
    pub fn import_path(&self, path: &Path) -> io::Result<StoredAttachment> {
        if !path.is_absolute() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "daemon attachment path must be absolute",
            ));
        }
        let source = fs::canonicalize(path)?;
        let name = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidInput, "invalid attachment name")
            })?;
        self.materialize(name, |target| copy_source(&source, target))
    }

    fn materialize(
        &self,
        name: &str,
        populate: impl FnOnce(&Path) -> io::Result<bool>,
    ) -> io::Result<StoredAttachment> {
        let name = safe_name(name)?;
        let id = Uuid::new_v4();
        let reference = format!("{ATTACHMENT_SCHEME}{id}");
        let staging = self.root.join(staging_name(id));
        let destination = self.root.join(id.to_string());
        fs::create_dir_all(&staging)?;
        let target = staging.join(&name);
        let materialized = populate(&target);
        let is_dir = match materialized {
            Ok(is_dir) => is_dir,
            Err(error) => {
                let _ = fs::remove_dir_all(&staging);
                return Err(error);
            }
        };
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
        }
        if let Err(error) = fs::rename(&staging, &destination) {
            let _ = fs::remove_dir_all(&staging);
            return Err(error);
        }
        Ok(StoredAttachment {
            reference,
            path: destination.join(&name),
            name,
            is_dir,
        })
    }

    pub fn path_for(&self, reference: &str) -> Option<PathBuf> {
        let id = reference.strip_prefix(ATTACHMENT_SCHEME)?;
        let id = Uuid::parse_str(id).ok()?;
        Some(self.root.join(id.to_string()))
    }

    /// Reads an attachment back, refusing anything the requesting client's
    /// transport could not carry in one message.
    pub fn read_file(
        &self,
        reference: &str,
        path: &Path,
        max_bytes: usize,
    ) -> io::Result<Vec<u8>> {
        let root = self.path_for(reference).ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "invalid attachment reference")
        })?;
        let relative = path.strip_prefix(&root).map_err(|_| {
            io::Error::new(
                io::ErrorKind::PermissionDenied,
                "attachment path does not belong to its reference",
            )
        })?;
        safe_relative_path(relative)?;
        // Checked before reading: an oversized attachment costs a metadata call
        // instead of loading the whole file only to refuse it.
        let size = fs::metadata(path)?.len();
        if size > max_bytes as u64 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "this attachment is {size} bytes and is too large to open on this device ({max_bytes} byte maximum)"
                ),
            ));
        }
        fs::read(path)
    }

    /// Removes daemon-owned attachment trees that are no longer referenced by
    /// persisted messages or composer drafts. In-progress staging directories
    /// are deliberately ignored so an upload cannot race a cleanup pass.
    pub fn retain(&self, live: &HashSet<String>) -> io::Result<u64> {
        self.retain_with_cutoff(live, None)
    }

    /// Reclaims only attachment trees old enough that no upload-to-draft or
    /// upload-to-session handoff can still be committing their references.
    pub fn retain_unreferenced_older_than(
        &self,
        live: &HashSet<String>,
        cutoff: SystemTime,
    ) -> io::Result<u64> {
        self.retain_with_cutoff(live, Some(cutoff))
    }

    fn retain_with_cutoff(
        &self,
        live: &HashSet<String>,
        cutoff: Option<SystemTime>,
    ) -> io::Result<u64> {
        let Ok(entries) = fs::read_dir(&self.root) else {
            return Ok(0);
        };
        let mut reclaimed = 0;
        for entry in entries.flatten() {
            let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
                continue;
            };
            let Ok(id) = Uuid::parse_str(&name) else {
                continue;
            };
            if live.contains(&format!("{ATTACHMENT_SCHEME}{id}")) {
                continue;
            }
            if cutoff.is_some_and(|cutoff| {
                entry
                    .metadata()
                    .and_then(|metadata| metadata.modified())
                    .map_or(true, |modified| modified >= cutoff)
            }) {
                continue;
            }
            reclaimed += directory_size(&entry.path()).unwrap_or_default();
            fs::remove_dir_all(entry.path())?;
        }
        Ok(reclaimed)
    }
}

fn copy_source(source: &Path, target: &Path) -> io::Result<bool> {
    let metadata = fs::symlink_metadata(source)?;
    if metadata.file_type().is_symlink() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "symbolic-link attachments are not supported",
        ));
    }
    if metadata.is_file() {
        if metadata.len() > MAX_ATTACHMENT_BYTES as u64 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "attachment is larger than 32 MB",
            ));
        }
        let copied = fs::copy(source, target)?;
        if copied > MAX_ATTACHMENT_BYTES as u64 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "attachment is larger than 32 MB",
            ));
        }
        return Ok(false);
    }
    if !metadata.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "attachment is not a file or directory",
        ));
    }

    fs::create_dir_all(target)?;
    let mut pending = vec![(source.to_owned(), target.to_owned())];
    let mut file_count = 0usize;
    let mut total_bytes = 0u64;
    while let Some((source_directory, target_directory)) = pending.pop() {
        for entry in fs::read_dir(source_directory)? {
            let entry = entry?;
            let source_path = entry.path();
            let target_path = target_directory.join(entry.file_name());
            let metadata = fs::symlink_metadata(&source_path)?;
            if metadata.file_type().is_symlink() {
                continue;
            }
            if metadata.is_dir() {
                fs::create_dir_all(&target_path)?;
                pending.push((source_path, target_path));
                continue;
            }
            if !metadata.is_file() {
                continue;
            }
            file_count += 1;
            if file_count > MAX_ATTACHMENT_FILES {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "attachment directory contains too many files",
                ));
            }
            total_bytes = total_bytes.checked_add(metadata.len()).ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "attachment directory is too large",
                )
            })?;
            if total_bytes > MAX_ATTACHMENT_BYTES as u64 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "attachment directory is too large",
                ));
            }
            let copied = fs::copy(source_path, target_path)?;
            if copied > metadata.len() {
                total_bytes = total_bytes
                    .checked_add(copied - metadata.len())
                    .ok_or_else(|| {
                        io::Error::new(
                            io::ErrorKind::InvalidInput,
                            "attachment directory is too large",
                        )
                    })?;
                if total_bytes > MAX_ATTACHMENT_BYTES as u64 {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "attachment directory is too large",
                    ));
                }
            }
        }
    }
    Ok(true)
}

fn directory_size(root: &Path) -> io::Result<u64> {
    let mut bytes = 0u64;
    let mut pending = vec![root.to_owned()];
    while let Some(directory) = pending.pop() {
        for entry in fs::read_dir(directory)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            if metadata.is_dir() {
                pending.push(entry.path());
            } else if metadata.is_file() {
                bytes = bytes.saturating_add(metadata.len());
            }
        }
    }
    Ok(bytes)
}

fn decode(data: &str) -> io::Result<Vec<u8>> {
    base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

/// The staging directory name a half-written attachment lives under until its
/// rename into place. `retain_with_cutoff` recognizes the `.tmp` suffix and
/// leaves these alone.
fn staging_name(id: Uuid) -> String {
    format!(".{id}.tmp")
}

fn unknown_upload() -> io::Error {
    io::Error::new(
        io::ErrorKind::NotFound,
        "attachment upload is unknown, expired, or already finished",
    )
}

fn oversized_attachment() -> io::Error {
    io::Error::new(
        io::ErrorKind::InvalidInput,
        "attachment is larger than 32 MB",
    )
}

fn ensure_size(bytes: usize) -> io::Result<()> {
    if bytes > MAX_ATTACHMENT_BYTES {
        Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "attachment is larger than 32 MB",
        ))
    } else {
        Ok(())
    }
}

fn safe_name(name: &str) -> io::Result<String> {
    let path = Path::new(name);
    let mut components = path.components();
    let name = components
        .next()
        .filter(|_| components.next().is_none())
        .and_then(|component| match component {
            Component::Normal(name) => name.to_str(),
            _ => None,
        })
        .filter(|name| !name.is_empty() && *name != "." && *name != "..")
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "invalid attachment name"))?;
    Ok(name.to_owned())
}

fn safe_relative_path(path: &Path) -> io::Result<&Path> {
    if path.as_os_str().is_empty()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "attachment entry escapes its root",
        ));
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn upload_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!("waku-attachments-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        root
    }

    /// Every staging directory this store still owns, so a test can assert
    /// that a discarded upload left nothing behind.
    fn staging_directories(root: &Path) -> Vec<PathBuf> {
        fs::read_dir(root)
            .unwrap()
            .flatten()
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.ends_with(".tmp"))
            })
            .collect()
    }

    #[test]
    fn chunked_upload_round_trips_the_received_bytes() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());

        let upload_id = store.begin_upload("photo.png", 11).unwrap();
        store.append_upload(upload_id, 0, b"hello ").unwrap();
        store.append_upload(upload_id, 6, b"world").unwrap();
        let stored = store.finish_upload(upload_id).unwrap();

        assert_eq!(stored.name, "photo.png");
        assert!(!stored.is_dir);
        assert_eq!(stored.reference, format!("{ATTACHMENT_SCHEME}{upload_id}"));
        assert_eq!(fs::read(&stored.path).unwrap(), b"hello world");
        assert!(staging_directories(&root).is_empty());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_chunk_that_does_not_continue_the_received_bytes_is_refused() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let upload_id = store.begin_upload("notes.txt", 6).unwrap();
        store.append_upload(upload_id, 0, b"abc").unwrap();

        // A replay and an overlap are both refused, and neither moves the
        // upload's position: the stream continues from where it really was.
        assert!(store.append_upload(upload_id, 0, b"abc").is_err());
        assert!(store.append_upload(upload_id, 1, b"bc").is_err());
        assert!(store.append_upload(upload_id, 4, b"ef").is_err());

        store.append_upload(upload_id, 3, b"def").unwrap();
        let stored = store.finish_upload(upload_id).unwrap();
        assert_eq!(fs::read(&stored.path).unwrap(), b"abcdef");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_chunk_pushing_past_the_advertised_limit_is_refused() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let upload_id = store
            .begin_upload("huge.bin", MAX_ATTACHMENT_BYTES as u64)
            .unwrap();

        store
            .append_upload(upload_id, 0, &vec![0u8; MAX_ATTACHMENT_BYTES])
            .unwrap();
        let refused = store.append_upload(upload_id, MAX_ATTACHMENT_BYTES as u64, b"x");

        assert!(refused.is_err());
        let stored = store.finish_upload(upload_id).unwrap();
        assert_eq!(
            fs::metadata(&stored.path).unwrap().len(),
            MAX_ATTACHMENT_BYTES as u64
        );

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_declared_size_past_the_advertised_limit_is_refused() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());

        assert!(
            store
                .begin_upload("huge.bin", MAX_ATTACHMENT_BYTES as u64 + 1)
                .is_err()
        );
        assert!(staging_directories(&root).is_empty());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn finishing_an_incomplete_upload_is_refused_and_discards_its_bytes() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let upload_id = store.begin_upload("half.txt", 10).unwrap();
        store.append_upload(upload_id, 0, b"half").unwrap();

        assert!(store.finish_upload(upload_id).is_err());
        assert!(staging_directories(&root).is_empty());
        // The upload is gone, not merely incomplete: its bytes were discarded.
        assert!(store.append_upload(upload_id, 4, b"more").is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn abort_leaves_no_staging_directory_behind() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let upload_id = store.begin_upload("abandoned.bin", 4096).unwrap();
        store.append_upload(upload_id, 0, b"partial").unwrap();
        assert_eq!(staging_directories(&root).len(), 1);

        store.abort_upload(upload_id).unwrap();

        assert!(fs::read_dir(&root).unwrap().next().is_none());
        // Aborting again is a no-op rather than an error: the bytes are
        // already gone, which is what the caller asked for.
        store.abort_upload(upload_id).unwrap();
        assert!(store.append_upload(upload_id, 0, b"x").is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn an_idle_upload_is_reclaimed_once_its_deadline_passes() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let upload_id = store.begin_upload("stalled.bin", 1024).unwrap();
        store.append_upload(upload_id, 0, b"stalled").unwrap();

        let not_yet = Instant::now() + ATTACHMENT_UPLOAD_IDLE_DEADLINE / 2;
        assert_eq!(store.expire_idle_uploads(not_yet).unwrap(), 0);
        assert_eq!(staging_directories(&root).len(), 1);

        let past_deadline = Instant::now() + ATTACHMENT_UPLOAD_IDLE_DEADLINE;
        assert_eq!(store.expire_idle_uploads(past_deadline).unwrap(), 7);
        assert!(staging_directories(&root).is_empty());
        // The id is no longer usable, so a late chunk cannot resurrect a
        // directory the reclaimer already deleted.
        assert!(store.append_upload(upload_id, 7, b"late").is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn the_number_of_uploads_in_flight_is_bounded() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let live: Vec<Uuid> = (0..MAX_CONCURRENT_ATTACHMENT_UPLOADS)
            .map(|index| store.begin_upload(&format!("{index}.bin"), 4).unwrap())
            .collect();

        assert!(store.begin_upload("one-too-many.bin", 4).is_err());
        assert_eq!(staging_directories(&root).len(), live.len());

        // A finished upload frees its slot rather than leaking it.
        store.append_upload(live[0], 0, b"done").unwrap();
        store.finish_upload(live[0]).unwrap();
        store.begin_upload("now-fits.bin", 4).unwrap();

        fs::remove_dir_all(root).unwrap();
    }

    /// A read that cannot fit in one message is refused with a reason, rather
    /// than returned and killing the client's socket at the transport layer.
    #[test]
    fn a_read_past_the_transport_ceiling_is_refused_with_a_reason() {
        let root = upload_root();
        let store = AttachmentStore::new(root.clone());
        let source = std::env::temp_dir().join(format!("waku-big-{}.png", Uuid::new_v4()));
        fs::write(&source, vec![7u8; 4096]).unwrap();
        let stored = store.import_path(&source).unwrap();

        let fits = store.read_file(&stored.reference, &stored.path, 4096).unwrap();
        assert_eq!(fits.len(), 4096);

        let refused = store.read_file(&stored.reference, &stored.path, 1024).unwrap_err();
        assert_eq!(refused.kind(), io::ErrorKind::InvalidInput);
        assert!(
            refused.to_string().contains("too large to open on this device"),
            "the refusal must say why: {refused}"
        );

        fs::remove_file(&source).unwrap();
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_parent_components() {
        assert!(safe_relative_path(Path::new("../secret")).is_err());
        assert!(safe_relative_path(Path::new("nested/file.txt")).is_ok());
        assert!(safe_name("../secret.txt").is_err());
        assert_eq!(safe_name("secret.txt").unwrap(), "secret.txt");
        assert!(ensure_size(MAX_ATTACHMENT_BYTES).is_ok());
        assert!(ensure_size(MAX_ATTACHMENT_BYTES + 1).is_err());
    }

    #[test]
    fn imports_any_daemon_file_without_routing_bytes_through_the_client() {
        let source_directory =
            std::env::temp_dir().join(format!("waku-file-source-{}", Uuid::new_v4()));
        let root = std::env::temp_dir().join(format!("waku-attachments-{}", Uuid::new_v4()));
        fs::create_dir_all(&source_directory).unwrap();
        let source = source_directory.join("design.md");
        fs::write(&source, "daemon-owned").unwrap();
        let store = AttachmentStore::new(root.clone());

        let stored = store.import_path(&source).unwrap();

        assert_eq!(stored.name, "design.md");
        assert!(!stored.is_dir);
        assert_eq!(fs::read_to_string(&stored.path).unwrap(), "daemon-owned");
        assert!(store.import_path(Path::new("relative.txt")).is_err());

        fs::remove_dir_all(source_directory).unwrap();
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn daemon_path_import_follows_symbolic_links() {
        use std::os::unix::fs::symlink;

        let outside = std::env::temp_dir().join(format!("waku-outside-{}", Uuid::new_v4()));
        let root = std::env::temp_dir().join(format!("waku-attachments-{}", Uuid::new_v4()));
        fs::create_dir_all(&outside).unwrap();
        fs::write(outside.join("secret.txt"), "secret").unwrap();
        let linked = outside.join("linked.txt");
        symlink(outside.join("secret.txt"), &linked).unwrap();
        let store = AttachmentStore::new(root.clone());

        let stored = store.import_path(&linked).unwrap();

        assert_eq!(stored.name, "secret.txt");
        assert_eq!(fs::read_to_string(stored.path).unwrap(), "secret");
        fs::remove_dir_all(outside).unwrap();
        if root.exists() {
            fs::remove_dir_all(root).unwrap();
        }
    }

    #[test]
    fn retain_removes_only_unreferenced_materializations() {
        let root = std::env::temp_dir().join(format!("waku-attachments-{}", Uuid::new_v4()));
        let store = AttachmentStore::new(root.clone());
        let keep = store
            .import(
                "keep.txt",
                AttachmentUpload::File {
                    data_base64: "a2VlcA==".into(),
                },
            )
            .unwrap();
        let remove = store
            .import(
                "remove.txt",
                AttachmentUpload::File {
                    data_base64: "cmVtb3Zl".into(),
                },
            )
            .unwrap();
        let live = HashSet::from([keep.reference.clone()]);

        assert_eq!(store.retain(&live).unwrap(), 6);
        assert!(keep.path.is_file());
        assert!(!remove.path.exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn recent_unreferenced_attachments_survive_a_grace_period_sweep() {
        let root = std::env::temp_dir().join(format!("waku-attachments-{}", Uuid::new_v4()));
        let store = AttachmentStore::new(root.clone());
        let recent = store
            .import(
                "recent.txt",
                AttachmentUpload::File {
                    data_base64: "cmVjZW50".into(),
                },
            )
            .unwrap();
        let cutoff = SystemTime::now()
            .checked_sub(std::time::Duration::from_secs(60))
            .unwrap();

        assert_eq!(
            store
                .retain_unreferenced_older_than(&HashSet::new(), cutoff)
                .unwrap(),
            0
        );
        assert!(recent.path.exists());

        fs::remove_dir_all(root).unwrap();
    }
}
