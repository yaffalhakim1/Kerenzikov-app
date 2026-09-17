/**
 * Column sizing for markdown tables.
 *
 * Port of the desktop's `column_widths` (`src/md/render.rs`): content-
 * proportional fractions with a water-filled floor, so a narrow column stays
 * readable instead of collapsing. The desktop lays the result out with
 * relative widths inside a fixed-width table; here the same fractions become
 * flex weights, which lets React Native share one width budget across every
 * row — the thing that makes columns line up.
 */

/** A column never drops below this share of an even split. */
const MIN_FRACTION_SCALE = 0.55;

/** The widest line in each column, in characters. Uncapped, mirroring the
 *  desktop: a cap would flatten two long columns to the same length and erase
 *  the proportionality the weights exist to express, exactly in the case where
 *  it matters most. Runaway width needs no bound here — the grid fills the
 *  transcript and long cells wrap, so no column can stretch the table. */
function longestLines(
  rows: readonly (readonly string[])[],
  columns: number,
): number[] {
  const longest = new Array<number>(columns).fill(0);
  for (const row of rows) {
    for (let index = 0; index < columns; index += 1) {
      const cell = row[index];
      if (cell === undefined) continue;
      const widest = Math.max(0, ...cell.split('\n').map((line) => [...line].length));
      if (widest > longest[index]!) longest[index] = widest;
    }
  }
  return longest;
}

export function columnWeights(
  rows: readonly (readonly string[])[],
  columns: number,
): number[] {
  if (columns <= 0) return [];
  return floorWeights(longestLines(rows, columns), columns);
}

/**
 * Water-fill content sizes into weights that sum to one and each clear
 * `MIN_COLUMN_CHARS`. Each pass pins every column that fell under the floor
 * and re-shares what is left among the rest, so the result stays proportional
 * where it can and legible where it cannot. Terminates in at most `columns`
 * passes, since every pass pins at least one column.
 */
function floorWeights(content: number[], columns: number): number[] {
  const even = 1 / columns;
  // A cell's widest line, floored at 1 so an empty column still takes space.
  const sizes = content.map((value) => Math.max(1, value));
  const total = sizes.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return new Array<number>(columns).fill(even);

  // A share of an even split, mirroring the desktop's MIN_FRACTION_SCALE. A
  // floor derived from character counts instead would scale with `columns`
  // and end up above `even`, pinning every column and erasing the very
  // proportionality the weights exist to express.
  const floorShare = even * MIN_FRACTION_SCALE;

  let weights = sizes.map((value) => value / total);
  const pinned = new Array<boolean>(columns).fill(false);
  for (let pass = 0; pass < columns; pass += 1) {
    const index = weights.findIndex((weight, at) => !pinned[at] && weight < floorShare);
    if (index < 0) break;
    pinned[index] = true;
    // Redistribute the unpinned columns across whatever budget is left, so the
    // pinned floor is never eroded by a later renormalisation.
    const remaining = 1 - floorShare * pinned.filter(Boolean).length;
    const freeTotal = weights.reduce(
      (sum, weight, at) => (pinned[at] ? sum : sum + weight),
      0,
    );
    weights = weights.map((weight, at) => {
      if (pinned[at]) return floorShare;
      return freeTotal > 0 ? (weight / freeTotal) * remaining : remaining / columns;
    });
  }

  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  return sum > 0 ? weights.map((weight) => weight / sum) : new Array<number>(columns).fill(even);
}

/** Tabular figures so a numeric column does not jitter between rows. */
export const TABLE_NUMERALS = ['tabular-nums'] as const;

export function cellIsNumeric(value: string): boolean {
  return /^[\s\d.,%$€£+\-()]*\d[\s\d.,%$€£+\-()]*$/u.test(value.trim());
}
