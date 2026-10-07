import { describe, expect, test } from 'bun:test';
import type { TodoItem } from '@waku/client';

import {
  TODO_STRIP_LIMIT,
  todoProgress,
  visibleTodoWindow,
} from './todo-strip';

function todos(spec: Array<[string, TodoItem['status']]>): TodoItem[] {
  return spec.map(([content, status]) => ({
    content,
    status,
    priority: '',
  })) as TodoItem[];
}

function plain(count: number): TodoItem[] {
  return todos(
    Array.from({ length: count }, (_, i) => [`task ${i + 1}`, 'pending'] as [string, TodoItem['status']]),
  );
}

describe('visibleTodoWindow', () => {
  test('a short plan shows in full', () => {
    expect(visibleTodoWindow(plain(4))).toEqual({
      start: 0,
      end: 4,
      hiddenBefore: 0,
      hiddenAfter: 0,
    });
  });

  test('an empty plan is an empty window', () => {
    expect(visibleTodoWindow([])).toEqual({
      start: 0,
      end: 0,
      hiddenBefore: 0,
      hiddenAfter: 0,
    });
  });

  test('exactly at the limit is still shown in full', () => {
    expect(visibleTodoWindow(plain(TODO_STRIP_LIMIT))).toEqual({
      start: 0,
      end: TODO_STRIP_LIMIT,
      hiddenBefore: 0,
      hiddenAfter: 0,
    });
  });

  test('a long plan windows around the in-progress item', () => {
    const plan = todos([
      ['a', 'completed'],
      ['b', 'completed'],
      ['c', 'completed'],
      ['d', 'in_progress'],
      ['e', 'pending'],
      ['f', 'pending'],
      ['g', 'pending'],
      ['h', 'pending'],
    ]);
    const window = visibleTodoWindow(plan);
    // 3 before the current item (index 3 -> start 1), 6 rows wide.
    expect(window).toEqual({
      start: 1,
      end: 7,
      hiddenBefore: 1,
      hiddenAfter: 1,
    });
    // The current item must be inside the window, always.
    expect(window.start).toBeLessThanOrEqual(3);
    expect(window.end).toBeGreaterThan(3);
  });

  test('a current item near the tail shifts the window back, never shortens it', () => {
    const plan = todos([
      ['a', 'completed'],
      ['b', 'completed'],
      ['c', 'completed'],
      ['d', 'completed'],
      ['e', 'completed'],
      ['f', 'completed'],
      ['g', 'in_progress'],
      ['h', 'pending'],
    ]);
    const window = visibleTodoWindow(plan);
    expect(window.end - window.start).toBe(TODO_STRIP_LIMIT);
    expect(window.end).toBe(8);
    expect(window.hiddenBefore).toBe(2);
    expect(window.hiddenAfter).toBe(0);
  });

  test('a finished plan shows its tail', () => {
    const plan = todos([
      ['a', 'completed'],
      ['b', 'completed'],
      ['c', 'completed'],
      ['d', 'completed'],
      ['e', 'completed'],
      ['f', 'completed'],
      ['g', 'completed'],
      ['h', 'completed'],
    ]);
    expect(visibleTodoWindow(plan)).toEqual({
      start: 2,
      end: 8,
      hiddenBefore: 2,
      hiddenAfter: 0,
    });
  });

  test('window width never exceeds the limit', () => {
    for (const count of [7, 8, 12, 40]) {
      for (let current = 0; current < count; current++) {
        const plan = todos(
          Array.from({ length: count }, (_, i) => [
            `task ${i}`,
            i === current ? 'in_progress' : 'pending',
          ] as [string, TodoItem['status']]),
        );
        const window = visibleTodoWindow(plan);
        expect(window.end - window.start).toBeLessThanOrEqual(TODO_STRIP_LIMIT);
        expect(window.start).toBeGreaterThanOrEqual(0);
        expect(window.end).toBeLessThanOrEqual(count);
        // The in-progress row is always visible.
        expect(window.start).toBeLessThanOrEqual(current);
        expect(window.end).toBeGreaterThan(current);
      }
    }
  });
});

describe('todoProgress', () => {
  test('counts completed against the total', () => {
    expect(
      todoProgress(
        todos([
          ['a', 'completed'],
          ['b', 'in_progress'],
          ['c', 'pending'],
        ]),
      ),
    ).toEqual([1, 3]);
  });

  test('a cancelled entry is unfinished, not done', () => {
    expect(
      todoProgress(
        todos([
          ['a', 'completed'],
          ['b', 'cancelled'],
        ]),
      ),
    ).toEqual([1, 2]);
  });

  test('an empty plan is zero of zero', () => {
    expect(todoProgress([])).toEqual([0, 0]);
  });
});
