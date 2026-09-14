//! The agent's own task list, as a popover off the composer's status row.
//!
//! OpenCode publishes this list itself — `todo.updated` on the session stream,
//! carrying `{content, status, priority}` per entry — so the panel is a view of
//! provider state, not a Waku feature the user maintains. The agent rewrites
//! the whole list each time, which is why an empty payload clears the panel
//! rather than merging into it.
//!
//! It lives behind an icon rather than as a standing panel because the list is
//! long, changes on the agent's schedule, and is only interesting on demand;
//! pinning it above the composer would spend the transcript's height on
//! something read occasionally.
//!
//! Render is reached from the transcript's notify path, so the work here has to
//! stay proportional to what is on screen: the entries are read straight off
//! the session projection and nothing is fetched, allocated per row beyond the
//! label, or measured. The popover's own contents are deferred until it opens.

use crate::model::{TodoItem, TodoStatus};

use super::*;

/// Entries shown before the rest are summarized. A plan long enough to outgrow
/// this is summarized rather than scrolled: the popover has no scroll
/// container, and a popover taller than the window would be worse than a
/// count.
const TODO_VISIBLE_LIMIT: usize = 8;

const TODO_MENU_ID: &str = "todo-panel";

/// How much of the plan is done, as `(completed, total)`.
///
/// Cancelled entries count toward the total but never toward `completed`, so a
/// plan the agent abandoned reads as unfinished rather than as done.
fn todo_progress(todos: &[TodoItem]) -> (usize, usize) {
    let completed = todos
        .iter()
        .filter(|todo| todo.status == TodoStatus::Completed)
        .count();
    (completed, todos.len())
}

/// The status row's task-list trigger, or `None` when the agent has published
/// no plan. `None` is the common case — most sessions never write one — so the
/// caller uses `.children(...)` and no control appears.
impl Waku {
    pub(super) fn render_todo_meter(&self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let todos = self.selected_session()?.todos.clone();
        if todos.is_empty() {
            return None;
        }
        let (completed, total) = todo_progress(&todos);
        let theme = Theme::current(cx);

        // No extra toggle work: unlike the usage meter there is nothing to
        // refresh, because the provider already pushed the whole list. The base
        // handle still handles visual focus so `escape` dismisses the card.
        let handle = self.menu_handle_with(TODO_MENU_ID, cx, |_, _, _| {});

        let trigger = div()
            .id("todo-meter")
            .h(px(20.0))
            .px(px(5.0))
            .rounded(px(5.0))
            .flex()
            .items_center()
            .gap(px(4.0))
            .flex_none()
            .cursor_default()
            .hover(|element| element.bg(theme.overlay))
            .when(handle.is_open(), |element| element.bg(theme.overlay_strong))
            .tooltip(Tooltip::text(SharedString::from(tr!("todo.tooltip"))))
            .child(icon("icons/list.svg", 12.0, theme.text_tertiary))
            .child(
                div()
                    .text_size(sp(11.5))
                    .text_color(theme.text_ghost)
                    .child(SharedString::from(format!("{completed}/{total}"))),
            );

        Some(popover(
            trigger,
            &handle,
            MenuAlign::AboveRight,
            move |handle, _, cx| todo_panel(handle, &todos, cx),
        ))
    }
}

fn todo_panel(handle: &ContextMenuHandle, todos: &[TodoItem], cx: &App) -> AnyElement {
    let theme = Theme::current(cx);
    let (completed, total) = todo_progress(todos);
    let hidden = total.saturating_sub(TODO_VISIBLE_LIMIT);

    let mut panel = div()
        // Focused on open so the surrounding menu context sees `escape`.
        .track_focus(handle.focus_handle())
        .w(px(300.0))
        .p(px(12.0))
        .rounded(px(10.0))
        .border_1()
        .border_color(theme.border_strong)
        .bg(theme.raised)
        .shadow_lg()
        .flex()
        .flex_col()
        .gap(px(7.0))
        .text_size(sp(12.5));

    panel = panel.child(
        div()
            .flex()
            .items_center()
            .gap(px(6.0))
            .child(
                div()
                    .flex_1()
                    .text_color(theme.text_secondary)
                    .child(tr!("todo.title")),
            )
            .child(
                div()
                    .text_size(sp(11.5))
                    .text_color(theme.text_ghost)
                    .child(SharedString::from(format!("{completed}/{total}"))),
            ),
    );

    for todo in todos.iter().take(TODO_VISIBLE_LIMIT) {
        panel = panel.child(todo_row(todo, &theme));
    }
    if hidden > 0 {
        panel = panel.child(
            div()
                .pl(px(17.0))
                .text_size(sp(11.5))
                .text_color(theme.text_ghost)
                .child(tr!("todo.more", count = hidden)),
        );
    }
    panel.into_any_element()
}

fn todo_row(todo: &TodoItem, theme: &Theme) -> Div {
    // The status icon carries the meaning, and the text weight and color
    // reinforce it — never color alone, so the row still reads in a theme
    // whose accent and ghost tones are close.
    let (glyph, glyph_color) = match todo.status {
        TodoStatus::Completed => ("icons/check.svg", theme.success),
        TodoStatus::InProgress => ("icons/loader-circle.svg", theme.accent),
        TodoStatus::Cancelled => ("icons/x.svg", theme.text_ghost),
        TodoStatus::Pending => ("icons/queue.svg", theme.text_ghost),
    };
    let text_color = match todo.status {
        TodoStatus::Completed | TodoStatus::Cancelled => theme.text_ghost,
        TodoStatus::InProgress => theme.text,
        TodoStatus::Pending => theme.text_secondary,
    };
    div()
        .flex()
        .items_center()
        .gap(px(6.0))
        .pl(px(1.0))
        .line_height(sp(15.0))
        .child(icon(glyph, 10.5, glyph_color))
        .child(
            div()
                .flex_1()
                .min_w_0()
                .truncate()
                .text_color(text_color)
                .child(SharedString::from(todo.content.clone())),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn todo(content: &str, status: TodoStatus) -> TodoItem {
        TodoItem {
            content: content.to_owned(),
            status,
            priority: String::new(),
        }
    }

    #[test]
    fn progress_counts_only_completed_entries() {
        let todos = [
            todo("a", TodoStatus::Completed),
            todo("b", TodoStatus::InProgress),
            todo("c", TodoStatus::Cancelled),
            todo("d", TodoStatus::Pending),
        ];

        // Cancelled is unfinished, not done: a plan the agent abandoned must
        // not read as complete.
        assert_eq!(todo_progress(&todos), (1, 4));
        assert_eq!(todo_progress(&[]), (0, 0));
    }

    #[test]
    fn every_status_is_open_except_the_two_terminal_ones() {
        assert!(TodoStatus::Pending.is_open());
        assert!(TodoStatus::InProgress.is_open());
        assert!(!TodoStatus::Completed.is_open());
        assert!(!TodoStatus::Cancelled.is_open());
    }
}
