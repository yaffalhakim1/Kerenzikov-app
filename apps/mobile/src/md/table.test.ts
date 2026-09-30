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

  test('a table wider than the column is fitted to it, not left to pan', () => {
    // The long horizontal drag a wide table used to demand: the cells must wrap
    // inside the available width instead.
    const row = Array.from({ length: 3 }, (_, index) => `column number ${index} value`);
    const widths = columnWidthsFor([row], 3, 340);
    const total = widths.reduce((sum, width) => sum + width, 0);
    expect(total).toBeLessThanOrEqual(340);
    // Fitting must not squeeze past the readable floor.
    for (const width of widths) expect(width).toBeGreaterThanOrEqual(56);
  });

  test('a table that already fits keeps its natural widths', () => {
    const rows = [['id', 'name'], ['1', 'Ada']];
    expect(columnWidthsFor(rows, 2, 400)).toEqual(columnWidthsFor(rows, 2));
  });

  test('a narrow column keeps its width while wide columns absorb the budget', () => {
    // Water-filling: the short column never grows, the long one takes the rest.
    const widths = columnWidthsFor([['id', 'a very long description that must wrap']], 2, 300);
    expect(widths[0]).toBe(56);
    expect(widths[1]).toBe(300 - 56);
  });

  test('more columns than the width can hold still overflows rather than collapsing', () => {
    // Seven columns cannot each clear the floor inside a 340dp budget (7 x 56 >
    // 340), so the grid goes past it and pans - the pre-existing behaviour,
    // kept as the fallback rather than squeezing cells to unreadable slivers.
    const row = Array.from({ length: 7 }, (_, index) => `column number ${index} value`);
    const widths = columnWidthsFor([row], 7, 340);
    for (const width of widths) expect(width).toBeGreaterThanOrEqual(56);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeGreaterThan(340);
  });
});
