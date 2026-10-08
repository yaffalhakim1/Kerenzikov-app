//! The agent's own task list, drawn two ways.
//!
//! OpenCode publishes this list itself — `todo.updated` on the session stream,
//! carrying `{content, status, priority}` per entry — so the panel is a view of
//! provider state, not a Waku feature the user maintains. The agent rewrites
//! the whole list each time, which is why an empty payload clears the panel
//! rather than merging into it.
//!
//! The standing form is the tray above the composer, windowed around the
//! in-progress step so the current work is visible without asking. The chip
//! beside the context circle opens the same list as a popover, and is the
//! folded affordance: it is drawn only while the tray is collapsed, so the two
//! never show the plan at once.
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

/// Entries the tray shows at once before it windows around the current one.
const TODO_TRAY_LIMIT: usize = 6;

/// Rows the tray shows ahead of the in-progress entry when the plan is longer
/// than [`TODO_TRAY_LIMIT`]. The trailing side takes the remainder, so the
/// window is exactly [`TODO_TRAY_LIMIT`] rows wide: the current item, this many
/// before it, and the rest after.
const TODO_TRAY_LEAD: usize = (TODO_TRAY_LIMIT - 1) / 2;

/// The slice of a plan the tray renders, plus how many entries it hid.
///
/// A short plan shows in full. A long one windows around the item being worked
/// on, so the current step is always visible without scrolling; a finished plan
/// has no current item, so it shows the last few instead — the end of the list
/// is where a finished plan's outcome is.
#[derive(Debug, PartialEq)]
pub(super) struct TodoWindow {
    pub start: usize,
    pub end: usize,
}

impl TodoWindow {
    pub(super) fn hidden_before(&self) -> usize {
        self.start
    }

    pub(super) fn hidden_after(&self, total: usize) -> usize {
        total.saturating_sub(self.end)
    }
}

pub(super) fn visible_todo_window(todos: &[TodoItem]) -> TodoWindow {
    let total = todos.len();
    if total <= TODO_TRAY_LIMIT {
        return TodoWindow { start: 0, end: total };
    }
    let current = todos
        .iter()
        .position(|todo| todo.status == TodoStatus::InProgress);
    let (start, end) = match current {
        Some(index) => {
            // Never run past the end: a current item near the tail shifts the
            // window back instead of shortening it.
            let start = index
                .saturating_sub(TODO_TRAY_LEAD)
                .min(total.saturating_sub(TODO_TRAY_LIMIT));
            (start, (start + TODO_TRAY_LIMIT).min(total))
        }
        // Nothing in progress: the end of the plan is what matters.
        None => (total.saturating_sub(TODO_TRAY_LIMIT), total),
    };
    TodoWindow { start, end }
}

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
    /// The id of the session the window is showing, if any.
    pub(super) fn selected_session_id(&self) -> Option<Uuid> {
        self.state.selected_session
    }

    /// Folds or unfolds the task-list tray for one session.
    pub(super) fn toggle_todo_tray(&mut self, session_id: &Uuid, cx: &mut Context<Self>) {
        if !self.todo_tray_collapsed.remove(session_id) {
            self.todo_tray_collapsed.insert(*session_id);
        }
        cx.notify();
    }

    /// The chip beside the context circle, which opens the plan as a popover.
    ///
    /// Suppressed while the tray is expanded: the tray already shows the plan,
    /// and a chip beside it is the same list twice. The chip is the folded
    /// affordance the tray doc describes, so it returns the moment the tray
    /// folds away and the plan still needs a way back.
    pub(super) fn render_todo_meter(&self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let todos = self.selected_session()?.todos.clone();
        if todos.is_empty() {
            return None;
        }
        if let Some(session_id) = self.selected_session_id()
            && !self.todo_tray_collapsed.contains(&session_id)
        {
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

    /// The plan as a tray above the composer.
    ///
    /// The meter in the footer answers "how far along is this" on demand; the
    /// tray answers "what is it doing" without asking, which is the question a
    /// long-running agent actually raises. It is windowed around the
    /// in-progress step and folds away to the meter's one-line form, so a long
    /// plan cannot spend the transcript's height.
    ///
    /// `None` when the agent has published no plan, which is the common case.
    pub(super) fn render_todo_tray(&self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let todos = self.selected_session()?.todos.clone();
        if todos.is_empty() {
            return None;
        }
        let theme = Theme::current(cx);
        let (completed, total) = todo_progress(&todos);
        let session_id = self.selected_session_id()?;

        let collapsed = self.todo_tray_collapsed.contains(&session_id);
        let mut tray = div()
            .flex()
            .flex_col()
            .gap(px(3.0))
            .px(px(10.0))
            .py(px(7.0))
            .rounded(px(10.0))
            .border_1()
            .border_color(theme.border)
            .bg(theme.composer)
            .text_size(sp(11.5));

        tray = tray.child(self.todo_tray_header(completed, total, collapsed, &theme, cx));
        if !collapsed {
            let window = visible_todo_window(&todos);
            if window.hidden_before() > 0 {
                tray = tray.child(todo_more_row(
                    SharedString::from(tr!("todo.earlier", count = window.hidden_before())),
                    &theme,
                ));
            }
            for todo in &todos[window.start..window.end] {
                tray = tray.child(todo_row(todo, &theme));
            }
            if window.hidden_after(total) > 0 {
                tray = tray.child(todo_more_row(
                    SharedString::from(tr!("todo.later", count = window.hidden_after(total))),
                    &theme,
                ));
            }
        }
        // Match the composer's column exactly — the same 20px gutter and 720px
        // cap, centered — so the tray's card edges line up with the card below
        // it rather than running the full width of the pane.
        Some(
            div()
                .flex_none()
                .px(px(20.0))
                .pb(px(6.0))
                .child(
                    div()
                        .w_full()
                        .max_w(px(CONTENT_MAX_WIDTH))
                        .mx_auto()
                        .child(tray),
                )
                .into_any_element(),
        )
    }

    /// `Tasks · 1/4` plus the disclosure control, which collapses the tray to
    /// this row alone. Clicking it is the only way the tray hides its steps.
    fn todo_tray_header(
        &self,
        completed: usize,
        total: usize,
        collapsed: bool,
        theme: &Theme,
        cx: &mut Context<Self>,
    ) -> Stateful<Div> {
        let session_id = self.selected_session_id();
        let count = if completed == total {
            SharedString::from(tr!("todo.all_done"))
        } else {
            SharedString::from(format!("{completed}/{total}"))
        };
        div()
            .id("todo-tray-header")
            .flex()
            .items_center()
            .gap(px(6.0))
            .cursor_default()
            .hover(|element| element.opacity(0.75))
            .on_click(cx.listener(move |this, _, _, cx| {
                if let Some(session_id) = session_id {
                    this.toggle_todo_tray(&session_id, cx);
                }
            }))
            .child(icon(
                if collapsed {
                    "icons/chevron-right.svg"
                } else {
                    "icons/chevron-down.svg"
                },
                10.0,
                theme.text_ghost,
            ))
            .child(
                div()
                    .flex_1()
                    .text_color(theme.text_secondary)
                    .child(tr!("todo.title")),
            )
            .child(div().text_color(theme.text_ghost).child(count))
    }
}

fn todo_more_row(label: SharedString, theme: &Theme) -> Div {
    div()
        .pl(px(17.0))
        .line_height(sp(15.0))
        .text_color(theme.text_ghost)
        .child(label)
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

    fn plain(count: usize) -> Vec<TodoItem> {
        (0..count)
            .map(|index| todo(&format!("task {index}"), TodoStatus::Pending))
            .collect()
    }

    /// A plan that fits shows in full with nothing hidden.
    #[test]
    fn a_short_plan_is_shown_whole() {
        let window = visible_todo_window(&plain(4));
        assert_eq!((window.start, window.end), (0, 4));
        assert_eq!(window.hidden_before(), 0);
        assert_eq!(window.hidden_after(4), 0);
    }

    /// The current step must always be visible: this is the whole reason the
    /// tray exists rather than a count in the footer.
    #[test]
    fn a_long_plan_windows_around_the_current_step() {
        let mut todos = plain(12);
        todos[7].status = TodoStatus::InProgress;

        let window = visible_todo_window(&todos);
        assert!(
            window.start <= 7 && 7 < window.end,
            "the current step is hidden"
        );
        assert_eq!(window.end - window.start, TODO_TRAY_LIMIT);
        assert!(window.hidden_before() > 0);
        assert!(window.hidden_after(12) > 0);
    }

    /// A step near the end must not push the window off the list.
    #[test]
    fn the_window_stays_inside_the_plan_at_its_edges() {
        for index in 0..12 {
            let mut todos = plain(12);
            todos[index].status = TodoStatus::InProgress;
            let window = visible_todo_window(&todos);
            assert!(window.start <= index && index < window.end, "index {index}");
            assert!(window.end <= 12, "index {index} overflowed");
        }
    }

    /// With nothing in progress the end of the plan is what matters.
    #[test]
    fn a_finished_or_stalled_plan_shows_its_tail() {
        let window = visible_todo_window(&plain(12));
        assert_eq!(window.end, 12);
        assert_eq!(window.end - window.start, TODO_TRAY_LIMIT);
        assert_eq!(window.hidden_after(12), 0);
    }

    #[test]
    fn an_empty_plan_has_an_empty_window() {
        let window = visible_todo_window(&[]);
        assert_eq!((window.start, window.end), (0, 0));
    }
}
