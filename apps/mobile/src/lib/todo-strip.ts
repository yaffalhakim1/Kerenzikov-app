import type { TodoItem } from '@waku/client';

/** Rows the strip shows before it starts windowing. */
export const TODO_STRIP_LIMIT = 6;

/**
 * Rows shown ahead of the in-progress entry when the plan is longer than
 * {@link TODO_STRIP_LIMIT}. The trailing side takes the remainder, so the
 * window is exactly `TODO_STRIP_LIMIT` rows wide: the current item, this many
 * before it, and the rest after.
 *
 * Mirrors the desktop tray (`src/app/todo_panel.rs`) so a plan reads the same
 * on a phone as on the desktop.
 */
const TODO_STRIP_LEAD = Math.floor((TODO_STRIP_LIMIT - 1) / 2);

/** The slice of a plan to render, plus how many entries it hid. */
export interface TodoStripWindow {
  /** First visible index into the plan. */
  start: number;
  /** One past the last visible index. */
  end: number;
  hiddenBefore: number;
  hiddenAfter: number;
}

/**
 * The slice of a plan the strip renders.
 *
 * A short plan shows in full. A long one windows around the item being worked
 * on, so the current step is always visible without scrolling; a finished plan
 * has no current item, so it shows the last few instead — the end of the list
 * is where a finished plan's outcome is.
 */
export function visibleTodoWindow(todos: TodoItem[]): TodoStripWindow {
  const total = todos.length;
  if (total <= TODO_STRIP_LIMIT) {
    return { start: 0, end: total, hiddenBefore: 0, hiddenAfter: 0 };
  }
  const current = todos.findIndex((todo) => todo.status === 'in_progress');
  let start: number;
  if (current === -1) {
    // Nothing in progress: the end of the plan is what matters.
    start = total - TODO_STRIP_LIMIT;
  } else {
    // Never run past the end: a current item near the tail shifts the window
    // back instead of shortening it.
    start = Math.max(0, current - TODO_STRIP_LEAD);
    start = Math.min(start, total - TODO_STRIP_LIMIT);
  }
  const end = Math.min(start + TODO_STRIP_LIMIT, total);
  return { start, end, hiddenBefore: start, hiddenAfter: total - end };
}

/** How much of the plan is done, as `[completed, total]`.
 *
 * Cancelled entries count toward the total but never toward `completed`, so a
 * plan the agent abandoned reads as unfinished rather than as done.
 */
export function todoProgress(todos: TodoItem[]): [number, number] {
  const completed = todos.filter((todo) => todo.status === 'completed').length;
  return [completed, todos.length];
}
