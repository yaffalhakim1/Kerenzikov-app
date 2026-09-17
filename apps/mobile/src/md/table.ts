/**
 * Column sizing for markdown tables.
 *
 * A markdown table on a phone cannot fit its transcript the way the desktop's
 * fixed-width transcript lets it (`render.rs` gives its table `w_full()` and
 * lets cells wrap). A phone is narrower than most tables want to be, and
 * wrapping every cell to reach a fixed width turns a table into a wall of
 * text. So the grid is laid out at the width its content needs and pans
 * horizontally when that exceeds the screen — the table keeps its shape and
 * the reader scrolls it.
 *
 * Each column takes the width its own longest line needs, and every row uses
 * the same widths, which is what lines the columns up down the table.
 */

/** Horizontal advance of one character in the table's body face, in dp. A
 *  rough measure — enough to lay out a grid, not a font metric. */
const CHAR_WIDTH = 8.2;

/** Cell padding plus one column rule, in dp. Mirrors the `tableCell` style's
 *  horizontal padding. */
const CELL_CHROME = 20;

/** A column is never narrower than this, dp: a single-character or dash-only
 *  column should still read as a cell rather than a hairline. */
const MIN_COLUMN_WIDTH = 56;

/** The widest line in each column, in characters, across every row. */
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

/** Each column's width in dp, shared by every row of the table. */
export function columnWidthsFor(
  rows: readonly (readonly string[])[],
  columns: number,
): number[] {
  if (columns <= 0) return [];
  return longestLines(rows, columns).map((chars) =>
    Math.max(MIN_COLUMN_WIDTH, chars * CHAR_WIDTH + CELL_CHROME),
  );
}
