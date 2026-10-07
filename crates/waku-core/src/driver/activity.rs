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

/// Parse a task list that arrives as named phases rather than a flat array.
///
/// Oh My Pi groups its tasks (`TodoPhase { name, tasks }`) and returns the whole
/// phase set from every `todo` operation, under the tool result's `details`
/// rather than the root. The phases are flattened into the one list the panel
/// draws; the phase names are dropped because no client renders them, and
/// inventing a heading row for a shape only one provider sends would cost every
/// other transport a concept it never has.
pub(super) fn todo_phases(entries: Option<&Value>) -> Vec<TodoItem> {
    entries
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|phase| phase.get("tasks").and_then(Value::as_array))
        .flatten()
        .filter_map(|task| {
            todo_item(
                task.get("content").and_then(Value::as_str)?,
                task.get("status").and_then(Value::as_str),
                None,
            )
        })
        .collect()
}

/// A plan-tool call's task list, if the tool actually carries one.
///
/// Some providers expose the task list as a tool call rather than a dedicated
/// event - Claude Code's and Amp's `TodoWrite`, Pi's and Oh My Pi's `todo` - and
/// put it under `todos` (Oh My Pi also accepts `plan` on the result). Oh My Pi
/// sends neither: it returns `details.phases`, a phased list one level below the
/// root, which is why the key lookup alone left its panel permanently empty.
///
/// Returns `None` when no field is present, so a tool that merely classifies as
/// `Plan` does not emit a spurious empty list; a present-but-empty list is
/// `Some(vec![])`, which is how a finished plan is cleared. Codex is not a
/// caller: it publishes the list on its own `turn/plan/updated` notification.
pub(super) fn plan_input_todos(input: &Value) -> Option<Vec<TodoItem>> {
    if let Some(entries) = input.get("todos").or_else(|| input.get("plan")) {
        return Some(todo_items(Some(entries)));
    }
    let phases = input
        .get("phases")
        .or_else(|| input.get("details").and_then(|details| details.get("phases")))?;
    Some(todo_phases(Some(phases)))
}

/// A task list rebuilt from providers that publish it one task at a time.
///
/// Claude Code v2.1.268 replaced the whole-list `TodoWrite` with `TaskCreate`,
/// `TaskUpdate`, `TaskGet` and `TaskList`. Those carry a single task per call:
/// `TaskCreate` has a `subject` but no id (the id arrives on the paired
/// `tool_result` as `tool_use_result.task.id`), and `TaskUpdate` patches one
/// task by id. Every other transport still republishes the whole list, so this
/// accumulator is only needed where the incremental shape is used.
///
/// State is per driver session and never crosses the wire: the driver emits
/// [`Self::snapshot`] after each mutation, so the rest of the pipe keeps
/// treating the list as replace-only.
#[derive(Default)]
pub(super) struct TodoAccumulator {
    /// Insertion-ordered so the list reads in the order the agent wrote it.
    tasks: Vec<(String, TodoItem)>,
    /// Task creates whose `tool_result` has not named them yet.
    staged: Vec<(String, String, Option<String>)>,
}

impl TodoAccumulator {
    /// A whole-list payload replaces everything, keeping the pipe's contract.
    pub(super) fn replace(&mut self, todos: Vec<TodoItem>) -> Vec<TodoItem> {
        self.tasks = todos
            .into_iter()
            .enumerate()
            .map(|(index, todo)| (format!("index-{index}"), todo))
            .collect();
        self.snapshot()
    }

    /// Records a `TaskCreate` under its tool-call id until the result names it.
    pub(super) fn stage_create(
        &mut self,
        tool_call_id: &str,
        subject: &str,
        active_form: Option<&str>,
    ) {
        if subject.trim().is_empty() {
            return;
        }
        let entry = (
            tool_call_id.to_owned(),
            subject.trim().to_owned(),
            active_form.map(str::trim).filter(|f| !f.is_empty()).map(str::to_owned),
        );
        match self.staged.iter_mut().find(|(id, ..)| id == tool_call_id) {
            Some(slot) => *slot = entry,
            None => self.staged.push(entry),
        }
    }

    /// The paired `tool_result` names the created task; promote it into the list.
    pub(super) fn resolve_create(&mut self, tool_call_id: &str, task_id: &str) -> Vec<TodoItem> {
        let index = self
            .staged
            .iter()
            .position(|(id, ..)| id == tool_call_id);
        let Some(index) = index else {
            return self.snapshot();
        };
        let (_, subject, _) = self.staged.remove(index);
        // A freshly created task is pending, so it reads as its subject. Its
        // active form belongs to the in-progress state, which arrives later.
        self.insert(task_id, &subject, TodoStatus::Pending);
        self.snapshot()
    }

    /// `TaskUpdate` patches one task; `status: "deleted"` removes it.
    ///
    /// Field names are read defensively because Claude Code repairs
    /// `id`/`task_id` to `taskId` before execution but *not* in the stream.
    pub(super) fn apply_update(&mut self, input: &Value) -> Vec<TodoItem> {
        let Some(task_id) = input
            .get("taskId")
            .or_else(|| input.get("id"))
            .or_else(|| input.get("task_id"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|id| !id.is_empty())
        else {
            return self.snapshot();
        };
        let status = input.get("status").and_then(Value::as_str);
        if status == Some("deleted") {
            self.tasks.retain(|(id, _)| id != task_id);
            return self.snapshot();
        }
        let subject = input
            .get("subject")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty());
        let active_form = input
            .get("activeForm")
            .or_else(|| input.get("active_form"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty());

        let existing = self
            .tasks
            .iter()
            .position(|(id, _)| id == task_id)
            .map(|index| self.tasks[index].1.content.clone());
        // An update addresses a task the list already holds. One naming an
        // unknown id is not a create, so it must not add a row.
        let Some(existing) = existing else {
            return self.snapshot();
        };
        // The display string follows the status: an in-progress task reads as
        // its active form, anything else as its subject. Fall back to whatever
        // the entry already showed when this update carries neither.
        let content = active_form.or(subject).unwrap_or(&existing);
        self.insert(task_id, content, status.map(todo_status).unwrap_or(TodoStatus::Pending));
        self.snapshot()
    }

    fn insert(&mut self, task_id: &str, content: &str, status: TodoStatus) {
        let Some(todo) = todo_item(content, None, None).map(|todo| TodoItem { status, ..todo })
        else {
            return;
        };
        match self.tasks.iter_mut().find(|(id, _)| id == task_id) {
            Some((_, slot)) => *slot = todo,
            None => self.tasks.push((task_id.to_owned(), todo)),
        }
    }

    pub(super) fn snapshot(&self) -> Vec<TodoItem> {
        self.tasks
            .iter()
            .map(|(_, todo)| todo.clone())
            .collect()
    }
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

    /// Oh My Pi returns its list as `details.phases` on the tool result, nested
    /// one level below the root and grouped into named phases. The root lookup
    /// alone missed it, which left its panel permanently empty.
    #[test]
    fn oh_my_pi_phases_flatten_from_the_result_details() {
        // Verbatim shape from @oh-my-pi/pi-coding-agent 18.4.5:
        // TodoToolDetails { op, phases: TodoPhase[], storage }.
        let result = serde_json::json!({
            "content": [{"type": "text", "text": "1/3 done"}],
            "details": {
                "op": "done",
                "storage": "session",
                "phases": [
                    {
                        "name": "Investigate",
                        "tasks": [
                            {"content": "Read the driver", "status": "completed"},
                            {"content": "Trace the wire", "status": "in_progress"}
                        ]
                    },
                    {
                        "name": "Ship",
                        "tasks": [
                            {"content": "Write the fix", "status": "pending"},
                            {"content": "Drop this idea", "status": "abandoned"},
                            {"content": "Waiting on review", "status": "blocked",
                             "blocker": "needs an ack"}
                        ]
                    }
                ]
            },
            "isError": false
        });

        assert_eq!(
            plan_input_todos(&result),
            Some(vec![
                TodoItem {
                    content: "Read the driver".into(),
                    status: TodoStatus::Completed,
                    priority: String::new(),
                },
                TodoItem {
                    content: "Trace the wire".into(),
                    status: TodoStatus::InProgress,
                    priority: String::new(),
                },
                TodoItem {
                    content: "Write the fix".into(),
                    status: TodoStatus::Pending,
                    priority: String::new(),
                },
                TodoItem {
                    content: "Drop this idea".into(),
                    status: TodoStatus::Cancelled,
                    priority: String::new(),
                },
                // `blocked` is outstanding, not cancelled: the agent has not
                // given up on it, so it must stay open in the panel.
                TodoItem {
                    content: "Waiting on review".into(),
                    status: TodoStatus::Pending,
                    priority: String::new(),
                },
            ])
        );
    }

    /// `phases` is accepted at the root too, so a caller that unwraps `details`
    /// before parsing keeps working, and an empty phase set clears the panel
    /// the same way an empty flat list does.
    #[test]
    fn oh_my_pi_phases_clear_and_tolerate_a_bare_root() {
        assert_eq!(
            plan_input_todos(&serde_json::json!({"phases": []})),
            Some(Vec::new())
        );
        assert_eq!(
            plan_input_todos(&serde_json::json!({"details": {"op": "view", "phases": []}})),
            Some(Vec::new())
        );
        // A phase whose tasks are missing or malformed must not panic, and a
        // task with no usable content is dropped rather than rendered blank.
        assert_eq!(
            plan_input_todos(&serde_json::json!({
                "phases": [
                    {"name": "Empty"},
                    {"name": "Kept", "tasks": [{"content": "  ", "status": "pending"},
                                               {"content": "real", "status": "pending"}]}
                ]
            })),
            Some(vec![TodoItem {
                content: "real".into(),
                status: TodoStatus::Pending,
                priority: String::new(),
            }])
        );
    }

    fn contents(todos: &[TodoItem]) -> Vec<(&str, TodoStatus)> {
        todos
            .iter()
            .map(|todo| (todo.content.as_str(), todo.status))
            .collect()
    }

    /// The whole-list path keeps replacing, which is what every transport other
    /// than Claude Code's task tools relies on.
    #[test]
    fn replace_swaps_the_whole_list() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("toolu_1", "first", None);
        accumulator.resolve_create("toolu_1", "1");

        let todos = accumulator.replace(vec![TodoItem {
            content: "only".into(),
            status: TodoStatus::InProgress,
            priority: String::new(),
        }]);
        assert_eq!(
            contents(&todos),
            vec![("only", TodoStatus::InProgress)],
            "a whole-list payload must not merge with accumulated state"
        );
    }

    /// The reason the accumulator exists: `TaskCreate` names no id, so the
    /// entry can only join the list once the paired result reports one.
    #[test]
    fn create_waits_for_the_result_to_name_the_task() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("toolu_1", "Read the driver", Some("Reading the driver"));
        assert!(
            accumulator.snapshot().is_empty(),
            "a staged create is not in the list until its result names it"
        );

        let todos = accumulator.resolve_create("toolu_1", "task-1");
        assert_eq!(
            contents(&todos),
            vec![("Read the driver", TodoStatus::Pending)],
            "a created task is pending, and its subject is the display string"
        );

        // A second resolve for the same tool call must not duplicate the entry.
        let again = accumulator.resolve_create("toolu_1", "task-1");
        assert_eq!(again.len(), 1);
    }

    /// An update addresses a task by id, and an in-progress one reads as its
    /// active form rather than its subject.
    #[test]
    fn update_patches_by_id_and_follows_the_status() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("toolu_1", "Read the driver", None);
        accumulator.resolve_create("toolu_1", "task-1");
        accumulator.stage_create("toolu_2", "Write the panel", None);
        accumulator.resolve_create("toolu_2", "task-2");

        let todos = accumulator.apply_update(&serde_json::json!({
            "taskId": "task-1",
            "status": "in_progress",
            "activeForm": "Reading the driver",
        }));
        assert_eq!(
            contents(&todos),
            vec![
                ("Reading the driver", TodoStatus::InProgress),
                ("Write the panel", TodoStatus::Pending),
            ],
            "order is the order the agent wrote the tasks"
        );
    }

    /// Claude Code repairs `id`/`task_id` before execution but not in the
    /// stream, so the update must read all three spellings.
    #[test]
    fn update_accepts_every_id_spelling_and_deletes() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("t1", "one", None);
        accumulator.resolve_create("t1", "task-1");
        accumulator.stage_create("t2", "two", None);
        accumulator.resolve_create("t2", "task-2");

        let via_id = accumulator.apply_update(&serde_json::json!({
            "id": "task-1",
            "status": "completed",
        }));
        assert_eq!(via_id[0].status, TodoStatus::Completed);

        let via_snake = accumulator.apply_update(&serde_json::json!({
            "task_id": "task-2",
            "status": "completed",
        }));
        assert_eq!(via_snake[1].status, TodoStatus::Completed);

        let after_delete = accumulator.apply_update(&serde_json::json!({
            "taskId": "task-1",
            "status": "deleted",
        }));
        assert_eq!(
            contents(&after_delete),
            vec![("two", TodoStatus::Completed)],
            "a deleted task leaves the list entirely"
        );
    }

    /// An update for a task this session never saw must not invent a row, and
    /// an unknown status must leave the task outstanding rather than dropping it.
    #[test]
    fn update_tolerates_unknown_ids_and_statuses() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("t1", "one", None);
        accumulator.resolve_create("t1", "task-1");

        let unknown = accumulator.apply_update(&serde_json::json!({
            "taskId": "task-9",
            "status": "completed",
        }));
        assert_eq!(unknown.len(), 1, "an unrelated id changes nothing");

        let future = accumulator.apply_update(&serde_json::json!({
            "taskId": "task-1",
            "status": "deferred_until_tuesday",
        }));
        assert_eq!(
            future[0].status,
            TodoStatus::Pending,
            "a status this build does not know leaves the task outstanding"
        );

        // No id at all is a no-op rather than an error.
        let idless = accumulator.apply_update(&serde_json::json!({"status": "completed"}));
        assert_eq!(idless.len(), 1);
    }

    #[test]
    fn blank_subjects_are_rejected() {
        let mut accumulator = TodoAccumulator::default();
        accumulator.stage_create("t1", "   ", None);
        assert!(accumulator.resolve_create("t1", "task-1").is_empty());
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
