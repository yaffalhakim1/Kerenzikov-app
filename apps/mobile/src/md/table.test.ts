import { describe, expect, test } from 'bun:test';

import { cellIsNumeric, columnWeights } from './table';

describe('columnWeights', () => {
  test('wider content gets a wider column and weights sum to one', () => {
    const weights = columnWeights([['id', 'a much longer description']], 2);
    expect(weights).toHaveLength(2);
    expect(weights[1]!).toBeGreaterThan(weights[0]!);
    expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
  });

  test('every column clears the readable floor even when starved', () => {
    // One enormous column would otherwise take nearly the whole table.
    const weights = columnWeights([['a', 'x'.repeat(400), 'b']], 3);
    // The floor is MIN_FRACTION_SCALE of an even split, mirroring the desktop.
    const floor = (1 / 3) * 0.55;
    for (const weight of weights) {
      expect(weight).toBeGreaterThanOrEqual(floor - 1e-9);
    }
    expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
  });

  test('a single column takes the whole width', () => {
    expect(columnWeights([['only']], 1)).toEqual([1]);
  });

  test('short cells stay proportional instead of being levelled to the floor', () => {
    const weights = columnWeights([['aaaa', 'bbbbbb']], 2);
    expect(weights[0]!).toBeCloseTo(0.4, 3);
    expect(weights[1]!).toBeCloseTo(0.6, 3);
  });

  test('missing and empty cells do not collapse a column', () => {
    const weights = columnWeights([['a'], ['b', '']], 2);
    expect(weights).toHaveLength(2);
    expect(weights.every((weight) => weight > 0)).toBe(true);
  });

  test('no columns is an empty layout', () => {
    expect(columnWeights([], 0)).toEqual([]);
  });
});

describe('columnWeights stays proportional as content grows', () => {
  test('two long columns are not flattened to an even split', () => {
    // Both cells run past any short cap, so a capped measure would call these
    // identical and hand each half the grid. The longer one must win.
    const weights = columnWeights(
      [['Pipes/dashes visible as literal text', 'Parser did not recognise the table']],
      2,
    );
    expect(weights[0]!).toBeGreaterThan(weights[1]!);
  });

  test('the widest column earns the largest share across many rows', () => {
    const weights = columnWeights([
      ['id', 'a much longer description column', 'n'],
      ['1', 'another long description here', '2'],
    ], 3);
    expect(Math.max(...weights)).toBe(weights[1]!);
  });
});

describe('cellIsNumeric', () => {
  test('recognises numeric and formatted values', () => {
    expect(cellIsNumeric('42')).toBe(true);
    expect(cellIsNumeric('1,234.56')).toBe(true);
    expect(cellIsNumeric('$3,000')).toBe(true);
    expect(cellIsNumeric('-12%')).toBe(true);
    expect(cellIsNumeric('(400)')).toBe(true);
  });

  test('rejects prose and mixed labels', () => {
    expect(cellIsNumeric('total')).toBe(false);
    expect(cellIsNumeric('')).toBe(false);
    expect(cellIsNumeric('turn 3 failed')).toBe(false);
  });
});
