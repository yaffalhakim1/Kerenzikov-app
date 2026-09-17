import { describe, expect, test } from 'bun:test';

import { columnWidthsFor } from './table';

describe('columnWidthsFor', () => {
  test('a wider column gets a wider track', () => {
    const widths = columnWidthsFor([['id', 'a much longer description column']], 2);
    expect(widths).toHaveLength(2);
    expect(widths[1]!).toBeGreaterThan(widths[0]!);
  });

  test('the widest line across every row sets a column', () => {
    const widths = columnWidthsFor([
      ['a', 'short'],
      ['a much longer first cell', 'short'],
    ], 2);
    // Row 2's first cell is the longest in column 0, so it decides that track.
    expect(widths[0]!).toBeGreaterThan(widths[1]!);
  });

  test('columns stay proportional as content grows, not flattened to even', () => {
    // The bug that a character cap caused: two long cells measuring identically
    // and splitting the table evenly. Raw lengths must stay distinct.
    const widths = columnWidthsFor(
      [['Pipes/dashes visible as literal text', 'Parser did not recognise it']],
      2,
    );
    expect(widths[0]!).toBeGreaterThan(widths[1]!);
  });

  test('a narrow column keeps a readable floor', () => {
    const widths = columnWidthsFor([['', 'x']], 2);
    for (const width of widths) expect(width).toBeGreaterThanOrEqual(56);
  });

  test('missing and ragged cells do not collapse a track', () => {
    const widths = columnWidthsFor([['a'], ['b', '']], 2);
    expect(widths).toHaveLength(2);
    expect(widths.every((width) => width >= 56)).toBe(true);
  });

  test('no columns is an empty layout', () => {
    expect(columnWidthsFor([], 0)).toEqual([]);
  });

  test('a table wider than a phone sums past the viewport', () => {
    // Five wordy columns cannot fit a 360dp screen, so the grid must exceed it
    // and let the scroller take over rather than squashing to fit.
    const row = Array.from({ length: 5 }, (_, index) => `column number ${index} value`);
    const total = columnWidthsFor([row], 5).reduce((sum, width) => sum + width, 0);
    expect(total).toBeGreaterThan(360);
  });
});
