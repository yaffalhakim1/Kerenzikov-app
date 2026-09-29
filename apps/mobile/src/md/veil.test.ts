import { describe, expect, test } from 'bun:test';

import {
  RowVeil,
  splitRunAtSpans,
  veilBoost,
  veilDurationMs,
  veilOpacity,
} from './veil';

describe('markdown streaming veil', () => {
  test('appended chunks fade once and independently', () => {
    const veil = new RowVeil();
    // A fresh chunk starts invisible with its whole fade ahead of it.
    expect(veil.advance(0, 'one ', 0)).toEqual([[0, 4, 0, 400]]);
    const spans = veil.advance(0, 'one two', 100);
    expect(spans.map(([start, end]) => [start, end])).toEqual([[0, 4], [4, 7]]);
    expect(spans[0]![2]).toBeGreaterThan(spans[1]![2]);
    expect(veil.advance(0, 'one two', 600)).toEqual([]);
    expect(veil.advance(0, 'one two', 700)).toEqual([]);
  });

  test('a span reports the time its fade has left', () => {
    const veil = new RowVeil();
    const [fresh] = veil.advance(0, 'one ', 0);
    const [later] = veil.advance(0, 'one ', 100);
    // The renderer animates from `opacity` to 1 over `remainingMs`, so a chunk
    // already under way must report less time than a fresh one.
    expect(fresh![3]).toBe(400);
    expect(later![3]).toBe(300);
    expect(later![2]).toBeGreaterThan(fresh![2]!);
    // Past its deadline the chunk is finished, not merely opaque.
    expect(veil.advance(0, 'one ', 400)).toEqual([]);
  });

  test('seeded rows do not refade existing content', () => {
    const veil = new RowVeil(true);
    expect(veil.advance(0, 'already here', 0)).toEqual([]);
    veil.finishSeeding();
    expect(veil.advance(0, 'already here plus', 100)).toEqual([[12, 17, 0, 400]]);
  });

  test('markdown rewrites keep the common prefix', () => {
    const veil = new RowVeil();
    veil.advance(0, 'intro **bol', 0);
    const spans = veil.advance(0, 'intro bold', 100);
    expect(spans[0]!.slice(0, 2)).toEqual([0, 6]);
    expect(spans[1]!.slice(0, 2)).toEqual([6, 10]);
  });

  test('frame lifecycle prunes elements that disappeared', () => {
    const veil = new RowVeil();
    veil.beginFrame();
    veil.advance(0, 'kept', 0);
    veil.advance(1, 'gone', 0);
    veil.finishFrame();
    veil.beginFrame();
    veil.advance(0, 'kept', 100);
    veil.finishFrame();
    // Element 1 was pruned; reappearing text fades in as fresh content.
    expect(veil.advance(1, 'gone', 200)).toEqual([[0, 4, 0, 400]]);
  });

  test('cadence curve matches the desktop veil', () => {
    expect(veilDurationMs(160)).toBe(400);
    expect(veilDurationMs(30)).toBe(120);
    expect(veilBoost(2)).toBe(1);
    expect(veilBoost(3)).toBeCloseTo(1.3);
    expect(veilOpacity(0)).toBe(0);
    expect(veilOpacity(1)).toBe(1);
    expect(veilOpacity(0.5)).toBeGreaterThan(0.5);
  });

  test('splits runs without changing covered lengths', () => {
    const pieces = splitRunAtSpans(0, 10, [[2, 8, 0.5, 120]]);
    expect(pieces).toEqual([[0, 2, 1, 0], [2, 8, 0.5, 120], [8, 10, 1, 0]]);
    const total = pieces.reduce((sum, [start, end]) => sum + (end - start), 0);
    expect(total).toBe(10);
    // A run fully inside a span keeps one piece at the span's opacity and time.
    expect(splitRunAtSpans(3, 2, [[2, 8, 0.25, 90]])).toEqual([[3, 5, 0.25, 90]]);
    // No spans: one unveiled piece, carrying no time.
    expect(splitRunAtSpans(4, 3, [])).toEqual([[4, 7, 1, 0]]);
  });

  test('never splits a surrogate pair at a chunk boundary', () => {
    const veil = new RowVeil();
    veil.advance(0, 'aa', 0);
    // The next append starts mid-emoji only if the prefix landed inside the
    // pair; the guard walks it back to the pair start.
    const spans = veil.advance(0, 'aa🎉', 100);
    expect(spans.at(-1)!.slice(0, 2)).toEqual([2, 4]);
  });
});
