import {
  MAX_WIRE_MESSAGE_BYTES,
  type MessageAttachment,
  type WakuClient,
} from '@waku/client';

/** Leave enough JSON/base64 headroom for the websocket envelope, while also
 * respecting the daemon's 32 MiB per-attachment limit. */
export const MAX_ATTACHMENT_BYTES = Math.min(
  32 * 1024 * 1024,
  Math.floor((MAX_WIRE_MESSAGE_BYTES * 3) / 4) - 1024 * 1024,
);

export interface LocalAttachmentFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  /** Picker-provided data avoids reading the URI again when available. */
  base64?: string | null;
}

/**
 * How many bytes one chunk carries.
 *
 * The ceiling is the transport's, not the daemon's: React Native's Android
 * WebSocket is OkHttp, and `RealWebSocket.send` closes the socket with 1001 as
 * soon as a queued message would take the buffer past 16 MiB. A whole
 * attachment in one request therefore killed the connection — the app reported
 * it as "Kerenzikov daemon disconnected" — which is what this path exists to
 * avoid. 1 MiB keeps every frame far under that line even after base64 inflates
 * it by a third, while staying large enough that a 32 MiB attachment is a few
 * dozen round-trips rather than a few thousand.
 */
export const ATTACHMENT_CHUNK_BYTES = 1024 * 1024;

export async function importLocalAttachment(
  client: WakuClient,
  local: LocalAttachmentFile,
): Promise<MessageAttachment> {
  if (local.size != null && local.size > MAX_ATTACHMENT_BYTES) {
    throw attachmentTooLarge(local.name);
  }

  // A picker that already handed us the bytes has no file to read, so those are
  // the source. Everything else is read from the URI it gave us.
  if (local.base64) {
    const encoded = local.base64.includes(',')
      ? local.base64.slice(local.base64.indexOf(',') + 1)
      : local.base64;
    const totalBytes = base64ByteLength(encoded);
    if (totalBytes <= 0) throw new Error(`${local.name} could not be read`);
    if (totalBytes > MAX_ATTACHMENT_BYTES) throw attachmentTooLarge(local.name);
    return uploadAttachmentInChunks(client, local, totalBytes, base64Reader(encoded));
  }

  return importUriAttachment(client, local);
}

/**
 * Streams a file the picker gave us as a URI.
 *
 * The bytes never all exist at once: one chunk is read, encoded, sent and
 * released before the next is read, so a 32 MiB attachment costs one chunk of
 * heap rather than the whole file plus its base64.
 */
async function importUriAttachment(
  client: WakuClient,
  local: LocalAttachmentFile,
): Promise<MessageAttachment> {
  // Dynamic, not static: a top-level import would load an Expo native module
  // into Bun's pure projection tests, which import this file. Metro still
  // bundles it for device builds.
  const { File, FileMode } = await import('expo-file-system');
  const file = new File(local.uri);
  // The file's own size, not the picker's `fileSize`. That field describes the
  // asset in the library, while the bytes being read here are the copy the
  // picker handed over — and a picker that recompresses makes the two disagree,
  // which would abort the upload at `finish` on a byte-count mismatch.
  const totalBytes = file.size ?? 0;
  if (totalBytes <= 0) throw new Error(`${local.name} could not be read`);
  if (totalBytes > MAX_ATTACHMENT_BYTES) throw attachmentTooLarge(local.name);
  // Read-only explicitly: `open()` otherwise defaults to read-write for a plain
  // path, and a photo handed over by the picker is one this app may be able to
  // read but not open for writing.
  const handle = file.open(FileMode.ReadOnly);
  return uploadAttachmentInChunks(client, local, totalBytes, {
    read: (length) => {
      const bytes = handle.readBytes(length);
      return bytes.byteLength === 0 ? null : encodeBase64(bytes);
    },
    close: () => handle.close(),
  });
}

/** Where a chunked upload's bytes come from. A seam rather than a direct
 *  `File` handle so the protocol below can be exercised without a native
 *  filesystem.
 *
 *  The reader yields the chunk already base64-encoded: encoding belongs to the
 *  source, which either has raw bytes to encode or a string that is already
 *  encoded. Doing it here would force the string source to decode what it was
 *  just handed. */
export interface AttachmentChunkReader {
  /** The next chunk, or `null` at end of input. */
  read(length: number): string | null;
  close(): void;
}

/**
 * A reader over a string the picker already encoded.
 *
 * The slice is taken on base64 character boundaries — four characters per three
 * bytes — so every chunk decodes to whole bytes and the daemon's running total
 * is the byte count rather than the character count.
 */
function base64Reader(encoded: string): AttachmentChunkReader {
  let cursor = 0;
  return {
    read: (length) => {
      if (cursor >= encoded.length) return null;
      // `length` is a byte budget and this is a string of characters: four
      // characters per three bytes. Comparing the two directly would under-read
      // by a third, which is why the conversion is here rather than a plain
      // slice.
      const characters = Math.floor(length / 3) * 4;
      const chunk = encoded.slice(cursor, cursor + characters);
      cursor += chunk.length;
      return chunk;
    },
    close: () => {},
  };
}

/**
 * The chunked upload protocol, independent of where the bytes come from.
 *
 * `offset` is sent explicitly and the daemon refuses a mismatch, so a retry
 * that replays a chunk is rejected rather than appended twice — the failure
 * mode that would silently corrupt the file.
 */
export async function uploadAttachmentInChunks(
  client: WakuClient,
  local: LocalAttachmentFile,
  totalBytes: number,
  reader: AttachmentChunkReader,
): Promise<MessageAttachment> {
  const started = await client.request({
    type: 'beginAttachmentUpload',
    name: local.name,
    totalBytes,
  });
  if (started.type !== 'attachmentUploadStarted') {
    throw new Error(`Expected attachmentUploadStarted, received ${started.type}`);
  }
  const uploadId = started.uploadId;

  try {
    let offset = 0;
    try {
      for (;;) {
        const data = reader.read(ATTACHMENT_CHUNK_BYTES);
        if (data === null) break;
        const response = await client.request({
          type: 'appendAttachmentUpload',
          uploadId,
          offset,
          data,
        });
        if (response.type !== 'ack') {
          throw new Error(`Expected ack, received ${response.type}`);
        }
        offset += base64ByteLength(data);
      }
    } finally {
      reader.close();
    }

    if (offset !== totalBytes) {
      throw new Error(
        `${local.name} changed while it was being attached (sent ${offset} of ${totalBytes} bytes)`,
      );
    }

    const finished = await client.request({
      type: 'finishAttachmentUpload',
      uploadId,
    });
    if (finished.type !== 'attachmentStored') {
      throw new Error(`Expected attachmentStored, received ${finished.type}`);
    }
    return toMessageAttachment(finished.attachment, local);
  } catch (cause) {
    // The daemon holds a staging directory until the upload finishes or is
    // abandoned, so a failure that never reaches `finish` has to say so.
    await client
      .request({ type: 'abortAttachmentUpload', uploadId })
      .catch(() => {});
    throw cause;
  }
}

function toMessageAttachment(
  stored: { path: string; name: string; isDir: boolean; reference: string },
  local: LocalAttachmentFile,
): MessageAttachment {
  return {
    path: stored.path,
    mention: stored.path,
    name: stored.name,
    is_dir: stored.isDir,
    is_image: local.mimeType?.startsWith('image/') === true || isImageName(local.name),
    blob_reference: stored.reference,
  };
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Standard base64 over raw bytes.
 *
 * Hand-rolled because the runtime this ships on has no encoder: Hermes defines
 * neither `btoa` nor `Buffer`, and the one dependency that would provide one is
 * not in the tree. Three bytes in, four characters out, is small enough to own
 * outright — and unlike a polyfill it cannot disagree with the daemon about
 * padding.
 */
function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const a = bytes[index]!;
    const b = remaining > 1 ? bytes[index + 1]! : 0;
    const c = remaining > 2 ? bytes[index + 2]! : 0;
    out += BASE64_ALPHABET[a >> 2];
    out += BASE64_ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    out += remaining > 1 ? BASE64_ALPHABET[((b & 0x0f) << 2) | (c >> 6)] : '=';
    out += remaining > 2 ? BASE64_ALPHABET[c & 0x3f] : '=';
  }
  return out;
}

/** Reads an attachment's bytes back from the daemon as a data URI. Blobs
 * Waku stored itself live under `waku-blob:` and need no path; everything
 * else is addressed by where the daemon put it. */
export async function readAttachmentImage(
  client: WakuClient,
  attachment: MessageAttachment,
): Promise<string> {
  const reference = attachment.blob_reference;
  if (!reference) throw new Error('This attachment has no daemon reference');
  const command = reference.startsWith('waku-blob:')
    ? ({ type: 'readBlob', reference } as const)
    : ({ type: 'readAttachment', reference, path: attachment.path } as const);
  const response = await client.request(command);
  if (response.type !== 'blobData') {
    throw new Error(`Expected blobData, received ${response.type}`);
  }
  return `data:${imageMimeType(attachment.name)};base64,${response.bytes}`;
}

/** Extension to MIME type for the images RN can decode. Unknown names fall
 * back to PNG, which is what an unrecognized binary most often is here. */
export function imageMimeType(name: string): string {
  const extension = name.split('.').at(-1)?.toLowerCase();
  return (
    {
      avif: 'image/avif',
      gif: 'image/gif',
      heic: 'image/heic',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    } as Record<string, string>
  )[extension ?? ''] ?? 'image/png';
}

/** Whether this attachment can be shown inline. Needs a daemon reference to
 * read back, and skips SVG, which RN's image decoder cannot rasterize — those
 * keep the name chip instead of rendering an empty tile. */
export function isPreviewableImage(attachment: MessageAttachment): boolean {
  return attachment.is_image === true
    && Boolean(attachment.blob_reference)
    && !attachment.name.toLowerCase().endsWith('.svg');
}

export function localFileName(uri: string, fallback: string): string {
  const segment = uri.split('/').at(-1)?.split(/[?#]/u)[0];
  if (!segment) return fallback;
  try {
    return decodeURIComponent(segment) || fallback;
  } catch {
    return segment;
  }
}

/** Image-picker assets arrive unnamed more often than not; give them a
 * stable, colliding-free name before import. */
export function imagePickerFiles(
  assets: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null; base64?: string | null }[],
  fallbackPrefix: string,
): LocalAttachmentFile[] {
  const timestamp = Date.now();
  return assets.map((asset, index) => ({
    uri: asset.uri,
    name: asset.fileName ?? localFileName(
      asset.uri,
      `${fallbackPrefix}-${timestamp}${assets.length > 1 ? `-${index + 1}` : ''}.jpg`,
    ),
    mimeType: asset.mimeType,
    size: asset.fileSize,
    base64: asset.base64,
  }));
}

function base64ByteLength(value: string): number {
  const normalized = value.replace(/\s/gu, '');
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function isImageName(name: string): boolean {
  return ['avif', 'gif', 'heic', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(
    name.split('.').at(-1)?.toLowerCase() ?? '',
  );
}

function attachmentTooLarge(name: string): Error {
  return new Error(`${name} is too large to attach (32 MB maximum)`);
}
