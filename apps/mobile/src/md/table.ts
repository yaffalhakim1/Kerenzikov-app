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

/** The width a column needs to hold its longest line on one line. */
function naturalWidths(
  rows: readonly (readonly string[])[],
  columns: number,
): number[] {
  return longestLines(rows, columns).map((chars) =>
    Math.max(MIN_COLUMN_WIDTH, chars * CHAR_WIDTH + CELL_CHROME),
  );
}

/**
 * Each column's width in dp, shared by every row of the table.
 *
 * `available` is the width the table has to live in — the transcript column,
 * not the viewport. A table that fits keeps every column at the width its
 * content wants, which is what keeps the columns aligned and readable. A table
 * that does not fit is **fitted**: the budget is shared out by water-filling —
 * a column that needs less than its even share keeps its natural width and the
 * leftover goes to the columns still over it — so the cells wrap and the whole
 * table stays on screen instead of demanding a long horizontal pan.
 *
 * The readable floor still wins over the budget: a table with more columns
 * than the phone can hold goes unreadable if every cell is squeezed to a
 * sliver, so past that point the grid overflows and pans as it always did.
 */
export function columnWidthsFor(
  rows: readonly (readonly string[])[],
  columns: number,
  available = Number.POSITIVE_INFINITY,
): number[] {
  if (columns <= 0) return [];
  const widths = naturalWidths(rows, columns);
  if (!Number.isFinite(available)) return widths;
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= available) return widths;

  let remaining = available;
  let pending = widths.map((_, index) => index);
  while (pending.length > 0) {
    const share = remaining / pending.length;
    const satisfied = pending.filter((index) => widths[index]! <= share);
    if (satisfied.length === 0) {
      // Nobody fits its share, so the floor decides and the grid overflows.
      for (const index of pending) widths[index] = Math.max(MIN_COLUMN_WIDTH, share);
      break;
    }
    for (const index of satisfied) remaining -= widths[index]!;
    pending = pending.filter((index) => !satisfied.includes(index));
  }
  return widths;
}
