//! Provider-neutral activity normalization.

use std::collections::HashSet;

use serde_json::Value;

use crate::model::{ActivityItem, ActivityKind, TodoItem, TodoStatus};

const MAX_ACTIVITY_CHARS: usize = 16_000;

pub(super) fn tool_activity(
    source_id: Option<String>,
    kind: ActivityKind,
    title: String,
    arguments: Option<&Value>,
    output: Option<&Value>,
    image_source: Option<&Value>,
    failed: bool,
    complete: bool,
) -> ActivityItem {
    let raw_arguments = arguments;
    let arguments = arguments
        .filter(|value| !value.is_null())
        .and_then(format_json);
    let formatted_output = output
        .filter(|value| !value.is_null())
        .and_then(format_output);
    let mut image_urls = Vec::new();
    if let Some(value) = output {
        collect_image_urls(value, &mut image_urls);
    }
    if let Some(value) = image_source {
        collect_image_urls(value, &mut image_urls);
    }
    let mut seen = HashSet::new();
    image_urls.retain(|url| seen.insert(url.clone()));
    let detail = failed
        .then(|| {
            formatted_output.as_deref()?.lines().find_map(|line| {
                let line = line.trim();
                (!line.is_empty()).then(|| line.to_owned())
            })
        })
        .flatten();

    ActivityItem::new(source_id, kind, title, detail, complete)
        .with_arguments(arguments)
        .with_activity_source(raw_arguments)
        .with_output(formatted_output)
        .with_image_urls(image_urls)
        .with_failed(failed)
}

/// One entry of a provider-pushed task list, normalized.
///
/// Every transport that publishes a plan spells the status differently - OpenCode
/// and ACP use `snake_case`, Codex ships its own enum, and Oh My Pi adds
/// `abandoned` - so the mapping lives here once instead of in each driver. An
/// unrecognized status degrades to `Pending`: a provider that grows a new state
/// must show the task as outstanding rather than losing it, and `Cancelled` is
/// reserved for the one terminal state that means the agent gave up on it.
///
/// Blank content is rejected because it would render as an empty row.
pub(super) fn todo_status(status: &str) -> TodoStatus {
    match status {
        "in_progress" | "inProgress" => TodoStatus::InProgress,
        "completed" => TodoStatus::Completed,
        "cancelled" | "canceled" | "abandoned" => TodoStatus::Cancelled,
        _ => TodoStatus::Pending,
    }
}

/// Build a task-list entry, or `None` when the provider sent no usable content.
pub(super) fn todo_item(
    content: &str,
    status: Option<&str>,
    priority: Option<&str>,
) -> Option<TodoItem> {
    let content = content.trim();
    if content.is_empty() {
        return None;
    }
    Some(TodoItem {
        content: content.to_owned(),
        status: status.map(todo_status).unwrap_or_default(),
        priority: priority.unwrap_or_default().to_owned(),
    })
}

/// Parse a provider task list from a JSON array of entries.
///
/// The `content` and `status` field names are shared by OpenCode, ACP, Codex and
/// Oh My Pi; `priority` is optional everywhere. `merge` (Oh My Pi) is
/// deliberately ignored: every provider here republishes the whole list, and the
/// clients replace rather than merge, so treating a partial list as complete is
/// the same contract the rest of the pipe already assumes.
pub(super) fn todo_items(entries: Option<&Value>) -> Vec<TodoItem> {
    entries
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let content = entry
                .get("content")
                .or_else(|| entry.get("step"))
                .and_then(Value::as_str)?;
            todo_item(
                content,
                entry.get("status").and_then(Value::as_str),
                entry.get("priority").and_then(Value::as_str),
            )
        })
        .collect()
}

/// A plan-tool call's task list, if the tool actually carries one.
///
/// Some providers expose the task list as a tool call rather than a dedicated
/// event - Claude Code's and Amp's `TodoWrite`, Pi's and Oh My Pi's `todo` - and
/// put it under `todos` (Oh My Pi also accepts `plan` on the result). Returns
/// `None` when neither field is present, so a tool that merely classifies as
/// `Plan` does not emit a spurious empty list; a present-but-empty list is
/// `Some(vec![])`, which is how a finished plan is cleared. Codex is not a
/// caller: it publishes the list on its own `turn/plan/updated` notification.
pub(super) fn plan_input_todos(input: &Value) -> Option<Vec<TodoItem>> {
    let entries = input.get("todos").or_else(|| input.get("plan"))?;
    Some(todo_items(Some(entries)))
}

pub(super) fn input_title(value: Option<&Value>) -> Option<String> {
    let value = value?;
    value
        .get("title")
        .or_else(|| value.pointer("/arguments/title"))
        .or_else(|| value.pointer("/input/title"))
        .or_else(|| value.pointer("/tool_input/title"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_supports_direct_and_provider_wrapped_arguments() {
        assert_eq!(
            input_title(Some(&serde_json::json!({"title": "Inspect app"}))).as_deref(),
            Some("Inspect app")
        );
        assert_eq!(
            input_title(Some(&serde_json::json!({
                "tool_name": "waku_js_repl__js",
                "arguments": {"code": "1", "title": "Inspect wrapped app"}
            })))
            .as_deref(),
            Some("Inspect wrapped app")
        );
        assert_eq!(
            input_title(Some(&serde_json::json!({
                "tool_name": "waku_js_repl__js",
                "tool_input": {"code": "1", "title": "Verify Grok bridge"}
            })))
            .as_deref(),
            Some("Verify Grok bridge")
        );
    }

    /// Every provider spells the status differently and each spelling must land
    /// on the same enum. `abandoned` is Oh My Pi's word for a task the agent gave
    /// up on, so it is cancelled - never left outstanding.
    #[test]
    fn statuses_from_every_provider_map_onto_the_shared_enum() {
        assert_eq!(todo_status("pending"), TodoStatus::Pending);
        assert_eq!(todo_status("in_progress"), TodoStatus::InProgress);
        assert_eq!(todo_status("inProgress"), TodoStatus::InProgress);
        assert_eq!(todo_status("completed"), TodoStatus::Completed);
        assert_eq!(todo_status("cancelled"), TodoStatus::Cancelled);
        assert_eq!(todo_status("abandoned"), TodoStatus::Cancelled);
        // An unknown state keeps the task visible as outstanding rather than
        // dropping it, which is what a provider growing a new status looks like.
        assert_eq!(todo_status("blocked"), TodoStatus::Pending);
    }

    /// OpenCode, ACP and Oh My Pi share `content`; Codex calls it `step`.
    /// Blank entries are dropped, priority is optional, and an absent status
    /// defaults to pending.
    #[test]
    fn todo_items_read_both_content_spellings_and_skip_blanks() {
        let todos = todo_items(Some(&serde_json::json!([
            {"content": "Read the driver", "status": "completed", "priority": "high"},
            {"step": "Write the panel", "status": "in_progress"},
            {"content": "   ", "status": "pending"},
            {"content": "No status"},
        ])));

        assert_eq!(todos.len(), 3, "a blank entry must not become a row");
        assert_eq!(todos[0].content, "Read the driver");
        assert_eq!(todos[0].status, TodoStatus::Completed);
        assert_eq!(todos[0].priority, "high");
        assert_eq!(todos[1].content, "Write the panel");
        assert_eq!(todos[1].status, TodoStatus::InProgress);
        assert_eq!(todos[1].priority, "");
        assert_eq!(todos[2].status, TodoStatus::Pending);
    }

    /// A present-but-empty list is how a finished plan is cleared, so it must
    /// come back as an empty vector rather than `None`.
    #[test]
    fn an_empty_list_is_a_clear_not_a_miss() {
        assert_eq!(todo_items(Some(&serde_json::json!([]))), Vec::new());
        assert_eq!(todo_items(None), Vec::new());
    }

    /// A tool that merely classifies as a plan but carries no list must not
    /// emit a spurious clear; a present empty list must.
    #[test]
    fn plan_input_only_reports_a_list_the_tool_actually_carried() {
        assert!(plan_input_todos(&serde_json::json!({"title": "Plan"})).is_none());
        assert_eq!(
            plan_input_todos(&serde_json::json!({"todos": []})),
            Some(Vec::new())
        );
        assert_eq!(
            plan_input_todos(&serde_json::json!({"plan": [{"step": "a", "status": "pending"}]})),
            Some(vec![TodoItem {
                content: "a".into(),
                status: TodoStatus::Pending,
                priority: String::new(),
            }])
        );
    }
}

pub(super) fn format_json(value: &Value) -> Option<String> {
    serde_json::to_string_pretty(value)
        .ok()
        .and_then(non_empty_text)
}

fn format_output(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return non_empty_text(text.to_owned());
    }
    if let Some(structured) = value
        .get("structuredContent")
        .filter(|value| !value.is_null())
    {
        return format_json(structured);
    }
    if let Some(content) = value.get("content").filter(|value| !value.is_null()) {
        return format_output(content);
    }
    if let Some(items) = value.as_array() {
        let text = items
            .iter()
            .filter(|item| !is_image_item(item))
            .filter_map(|item| {
                item.as_str().map(str::to_owned).or_else(|| {
                    (item.get("type").and_then(Value::as_str) == Some("text"))
                        .then(|| item.get("text").and_then(Value::as_str).map(str::to_owned))
                        .flatten()
                        .or_else(|| format_json(item))
                })
            })
            .collect::<Vec<_>>()
            .join("\n\n");
        return non_empty_text(text);
    }
    format_json(value)
}

fn collect_image_urls(value: &Value, urls: &mut Vec<String>) {
    match value {
        Value::Array(items) => {
            for item in items {
                collect_image_urls(item, urls);
            }
        }
        Value::Object(object) => {
            if is_image_item(value) {
                if let Some(url) = object
                    .get("imageUrl")
                    .or_else(|| object.get("image_url"))
                    .or_else(|| object.get("url"))
                    .and_then(Value::as_str)
                {
                    urls.push(url.to_owned());
                } else if let Some(data) = object.get("data").and_then(Value::as_str) {
                    let mime = object
                        .get("mime")
                        .or_else(|| object.get("mimeType"))
                        .or_else(|| object.get("mime_type"))
                        .or_else(|| {
                            object
                                .get("source")
                                .and_then(|source| source.get("media_type"))
                        })
                        .and_then(Value::as_str)
                        .unwrap_or("image/png");
                    urls.push(format!("data:{mime};base64,{data}"));
                } else if let Some(data) = object
                    .get("source")
                    .and_then(|source| source.get("data"))
                    .and_then(Value::as_str)
                {
                    let mime = object
                        .get("source")
                        .and_then(|source| source.get("media_type"))
                        .and_then(Value::as_str)
                        .unwrap_or("image/png");
                    urls.push(format!("data:{mime};base64,{data}"));
                }
            }
            for key in ["content", "attachments", "files", "result"] {
                if let Some(nested) = object.get(key) {
                    collect_image_urls(nested, urls);
                }
            }
        }
        _ => {}
    }
}

fn is_image_item(value: &Value) -> bool {
    let item_type = value.get("type").and_then(Value::as_str);
    let mime = value
        .get("mime")
        .or_else(|| value.get("mimeType"))
        .or_else(|| value.get("mime_type"))
        .or_else(|| value.pointer("/source/media_type"))
        .and_then(Value::as_str);
    matches!(item_type, Some("image" | "inputImage"))
        || (item_type == Some("file") && mime.is_some_and(|mime| mime.starts_with("image/")))
}

fn non_empty_text(value: String) -> Option<String> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return None;
    }
    if value.chars().count() <= MAX_ACTIVITY_CHARS {
        return Some(value);
    }
    let mut truncated = value.chars().take(MAX_ACTIVITY_CHARS).collect::<String>();
    truncated.push_str(&tr!("activity.output_truncated"));
    Some(truncated)
}
