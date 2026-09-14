//! Per-project long-term memory: a `MEMORY.md` in the project plus one file
//! per fact under the user's home directory.
//!
//! The project file follows the agent convention other CLIs already read, so
//! a fact remembered here is visible to raw `copilot`/`cursor` runs too. The
//! per-fact files stay out of the repo; `MEMORY.md` is the curated,
//! human-editable surface and the loader caps everything it injects.
//!
//! Reads happen on the submission path, so they stay small and synchronous:
//! one short file plus the newest facts, truncated to [`MAX_CONTEXT_BYTES`].

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Cap on injected memory context per prompt. Extraction may store more; the
/// loader always truncates oldest-first so a long memory cannot bloat turns.
pub const MAX_CONTEXT_BYTES: usize = 4096;
/// Transcript excerpt handed to the extraction prompt per side.
pub const MAX_EXCERPT_BYTES: usize = 2000;

pub const MEMORY_FILE: &str = "MEMORY.md";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemoryFact {
    pub title: String,
    pub body: String,
    pub created_at: u64,
}

fn unix_time() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

/// Stable, readable directory name for a project path. Content-hashed names
/// would hide which project a fact belongs to when browsing `~/.waku`.
fn project_slug(project: &Path) -> String {
    let slug = project
        .to_string_lossy()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .to_owned();
    let slug = if slug.is_empty() { "project".to_owned() } else { slug };
    if slug.len() > 128 {
        slug[..128].to_owned()
    } else {
        slug
    }
}

pub fn memory_file(project: &Path) -> PathBuf {
    project.join(MEMORY_FILE)
}

pub fn facts_dir(project: &Path) -> Option<PathBuf> {
    dirs::home_dir().map(|home| {
        home.join(".waku")
            .join("memory")
            .join(project_slug(project))
    })
}

/// Newest-first fact files on disk. Filesystem reads stay on the submission
/// path, so this lists one small directory and nothing else.
fn stored_facts(project: &Path) -> Vec<(PathBuf, String)> {
    let Some(directory) = facts_dir(project) else {
        return Vec::new();
    };
    let Ok(entries) = std::fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut facts = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("md"))
        .filter_map(|path| std::fs::read_to_string(&path).ok().map(|body| (path, body)))
        .collect::<Vec<_>>();
    facts.sort_by(|left, right| right.0.cmp(&left.0));
    facts
}

/// The context block prepended to provider prompts. Empty when the project
/// remembers nothing, so sessions without memory pay nothing.
pub fn load_context(project: &Path) -> String {
    let mut context = std::fs::read_to_string(memory_file(project)).unwrap_or_default();
    for (_, body) in stored_facts(project) {
        if context.len() >= MAX_CONTEXT_BYTES {
            break;
        }
        if !context.is_empty() && !context.ends_with('\n') {
            context.push('\n');
        }
        context.push_str(&body);
        if !context.ends_with('\n') {
            context.push('\n');
        }
    }
    truncate_utf8(context, MAX_CONTEXT_BYTES)
}

fn truncate_utf8(mut value: String, limit: usize) -> String {
    if value.len() <= limit {
        return value;
    }
    let mut end = limit;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value.truncate(end);
    value
}

fn fact_title(text: &str) -> String {
    let title = text.lines().next().unwrap_or_default().trim();
    let title = title
        .strip_prefix("- ")
        .or_else(|| title.strip_prefix("* "))
        .unwrap_or(title);
    let mut title = title.chars().take(80).collect::<String>();
    if title.trim().is_empty() {
        title = "Untitled fact".to_owned();
    }
    title
}

/// Store one fact: a section in `MEMORY.md` plus its own file. Returns the
/// fact file path.
pub fn remember(project: &Path, text: &str) -> anyhow::Result<PathBuf> {
    let text = text.trim();
    if text.is_empty() {
        anyhow::bail!("nothing to remember");
    }
    let fact = MemoryFact {
        title: fact_title(text),
        body: text.to_owned(),
        created_at: unix_time(),
    };
    let path = memory_file(project);
    if !path.exists() {
        std::fs::write(
            &path,
            "# Project memory\n\nFacts below are recalled into every session.\n",
        )?;
    }
    let mut memory = std::fs::read_to_string(&path).unwrap_or_default();
    if !memory.is_empty() && !memory.ends_with('\n') {
        memory.push('\n');
    }
    memory.push_str(&format!("\n## {}\n{}\n", fact.title, fact.body));
    std::fs::write(&path, memory)?;

    let directory = facts_dir(project)
        .ok_or_else(|| anyhow::anyhow!("the home directory is unavailable"))?;
    std::fs::create_dir_all(&directory)?;
    let file = directory.join(format!("fact-{}-{}.md", fact.created_at, fact.title.len()));
    std::fs::write(&file, format!("# {}\n\n{}\n", fact.title, fact.body))?;
    Ok(file)
}

/// The curated sections of `MEMORY.md` as `(title, body)` pairs, in file
/// order. Empty when the project remembers nothing. This is the editable
/// surface the Settings page draws from.
pub fn list_sections(project: &Path) -> Vec<(String, String)> {
    let path = memory_file(project);
    let Ok(memory) = std::fs::read_to_string(&path) else {
        return Vec::new();
    };
    split_sections(&memory).1
}

/// Forget the single section titled `title`. Returns whether anything was
/// removed. Unlike [`forget`]'s substring match, this only drops the exact
/// section the Settings page's delete button names.
pub fn forget_section(project: &Path, title: &str) -> anyhow::Result<bool> {
    let path = memory_file(project);
    let Ok(memory) = std::fs::read_to_string(&path) else {
        return Ok(false);
    };
    let (header, sections) = split_sections(&memory);
    let retained = sections
        .iter()
        .filter(|(section_title, _)| section_title != title)
        .collect::<Vec<_>>();
    if retained.len() == sections.len() {
        return Ok(false);
    }
    let mut rewritten = header;
    for (section_title, body) in retained {
        rewritten.push_str(&format!("## {section_title}\n{body}"));
    }
    std::fs::write(&path, rewritten)?;
    // The per-fact files mirror MEMORY.md; drop the ones this section owns
    // so the loader stops recalling them. Titles are unique per section, so
    // matching the `# {title}` heading is exact enough.
    for (path, body) in stored_facts(project) {
        let owns = body.lines().next().is_some_and(|heading| {
            heading.strip_prefix("# ").unwrap_or_default().trim() == title
        });
        if owns {
            let _ = std::fs::remove_file(&path);
        }
    }
    Ok(true)
}

/// Split `MEMORY.md` into its header and `## ` sections.
fn split_sections(memory: &str) -> (String, Vec<(String, String)>) {
    let mut header = String::new();
    let mut sections = Vec::new();
    let mut current: Option<(String, String)> = None;
    for line in memory.split_inclusive('\n') {
        if let Some(title) = line.strip_prefix("## ") {
            if let Some(section) = current.take() {
                sections.push(section);
            }
            current = Some((title.trim().to_owned(), String::new()));
        } else if let Some((_, body)) = current.as_mut() {
            body.push_str(line);
        } else {
            header.push_str(line);
        }
    }
    if let Some(section) = current.take() {
        sections.push(section);
    }
    (header, sections)
}

/// Forget every fact whose title or body contains `query`. Returns how many
/// fact files were removed.
pub fn forget(project: &Path, query: &str) -> anyhow::Result<usize> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        anyhow::bail!("nothing to forget");
    }
    let mut removed = 0;
    for (path, body) in stored_facts(project) {
        if body.to_lowercase().contains(&query) && std::fs::remove_file(&path).is_ok() {
            removed += 1;
        }
    }
    let path = memory_file(project);
    if let Ok(memory) = std::fs::read_to_string(&path) {
        let (header, sections) = split_sections(&memory);
        let retained = sections
            .iter()
            .filter(|(title, body)| {
                !title.to_lowercase().contains(&query) && !body.to_lowercase().contains(&query)
            })
            .collect::<Vec<_>>();
        if retained.len() != sections.len() {
            let mut rewritten = header;
            for (title, body) in retained {
                rewritten.push_str(&format!("## {title}\n{body}"));
            }
            std::fs::write(&path, rewritten)?;
        }
    }
    Ok(removed)
}

/// Looks-like-a-secret guard for auto-extracted facts. Explicit `/remember`
/// bypasses it: the user said so.
pub fn looks_like_secret(text: &str) -> bool {
    const MARKERS: &[&str] = &[
        "api_key",
        "apikey",
        "api-key",
        "secret_key",
        "client_secret",
        "password=",
        "passwd=",
        "bearer ",
        "aws_secret",
    ];
    let lowered = text.to_lowercase();
    MARKERS.iter().any(|marker| lowered.contains(marker))
}

/// Extraction prompt over the finished turn's excerpt. Demands `NONE` when
/// nothing is durable so the common case costs one short reply.
pub fn extraction_prompt(excerpt: &str) -> String {
    format!(
        "From this finished agent turn, extract durable project facts worth \
         remembering across sessions (conventions, decisions, environment quirks, \
         gotchas). Reply with one `- title: body` line per fact, or exactly \
         `NONE` when nothing is worth keeping. Skip secrets and credentials.\n\n\
         Turn:\n{excerpt}"
    )
}

/// Parse `- title: body` lines out of an extraction reply.
pub fn parse_extracted(reply: &str) -> Vec<(String, String)> {
    reply
        .lines()
        .map(str::trim)
        .filter_map(|line| line.strip_prefix("- ").or_else(|| line.strip_prefix("* ")))
        .filter_map(|line| line.split_once(':'))
        .map(|(title, body)| (title.trim().to_owned(), body.trim().to_owned()))
        .filter(|(title, body)| !title.is_empty() && !body.is_empty())
        .filter(|(_, body)| !looks_like_secret(body))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_project(name: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!(
            "waku-memory-test-{}-{name}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&directory);
        std::fs::create_dir_all(&directory).expect("create memory fixture");
        directory
    }

    #[test]
    fn empty_project_loads_no_context() {
        assert!(load_context(&fixture_project("empty")).is_empty());
    }

    #[test]
    fn remember_round_trips_into_capped_context() {
        let project = fixture_project("round-trip");
        remember(&project, "Uses pnpm, never npm.").expect("remember a fact");

        let context = load_context(&project);
        assert!(context.contains("Uses pnpm, never npm."));
        assert!(memory_file(&project).is_file());
    }

    #[test]
    fn forget_removes_matching_facts_and_sections() {
        let project = fixture_project("forget");
        remember(&project, "Uses pnpm, never npm.").expect("remember one");
        remember(&project, "Deploys on Fridays.").expect("remember two");

        assert_eq!(forget(&project, "pnpm").expect("forget one"), 1);
        let context = load_context(&project);
        assert!(!context.contains("pnpm"));
        assert!(context.contains("Fridays"));
        assert_eq!(forget(&project, "nothing matches this").expect("forget none"), 0);
    }

    #[test]
    fn section_listing_and_exact_delete_round_trip() {
        let project = fixture_project("sections");
        remember(&project, "Uses pnpm, never npm.").expect("remember one");
        remember(&project, "Deploys on Fridays.").expect("remember two");

        let sections = list_sections(&project);
        assert_eq!(sections.len(), 2);
        let title = sections[0].0.clone();
        assert!(forget_section(&project, &title).expect("delete one"));
        assert!(!forget_section(&project, &title).expect("delete none"));
        let sections = list_sections(&project);
        assert_eq!(sections.len(), 1);
        assert!(!sections.iter().any(|(section, _)| section == &title));
    }

    #[test]
    fn extraction_parses_bullets_and_rejects_secrets() {
        let facts = parse_extracted(
            "- Build: run `bun run build` before pushing\n- Token: bearer abc123\n- : empty\nNONE",
        );
        assert_eq!(facts.len(), 1);
        assert_eq!(facts[0].0, "Build");
    }

    #[test]
    fn project_slugs_stay_stable_and_filesystem_safe() {
        let slug = project_slug(Path::new("C:\\Users\\example\\Documents\\waku"));
        assert!(!slug.is_empty());
        assert!(slug.chars().all(|character| character.is_ascii_alphanumeric() || character == '_'));
        assert_eq!(slug, project_slug(Path::new("C:\\Users\\example\\Documents\\waku")));
    }
}
