// A1-notation helpers: column letter <-> 0-based index, sheet-name quoting, range
// building, and A1 -> GridRange conversion (for batchUpdate requests). Centralized
// so base-26 column math and the quoting rule aren't re-derived in every tool.

/** 0-based column index -> letters. 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/** Column letters -> 0-based index. "A" -> 0, "Z" -> 25, "AA" -> 26. */
export function columnLetterToIndex(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

/**
 * Single-quote a worksheet title for use in an A1 range, doubling any embedded
 * apostrophe (Google's escaping rule). Always quoting is safe and avoids the
 * first-visible-sheet trap for names with spaces/special characters.
 */
export function quoteSheetName(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/** Build a sheet-qualified A1 range, e.g. ("My Sheet", "A1:C10") -> "'My Sheet'!A1:C10". */
export function buildRange(worksheet: string, a1: string): string {
  return `${quoteSheetName(worksheet)}!${a1}`;
}

export interface GridRange {
  sheetId: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

interface CellRef {
  col: number | null;
  row: number | null;
}

function parseCell(ref: string): CellRef {
  const m = ref.trim().match(/^([A-Za-z]*)(\d*)$/);
  if (!m) throw new Error(`Invalid A1 cell reference: "${ref}"`);
  const [, letters, digits] = m;
  return {
    col: letters ? columnLetterToIndex(letters) : null,
    row: digits ? parseInt(digits, 10) : null,
  };
}

/**
 * Convert an A1 range (the part after `!`, e.g. "A1:C10", "A:A", "1:1", "B2") to a
 * GridRange (0-based, half-open end) for a batchUpdate request. Open-ended sides
 * (whole column "A:A" / whole row "1:1") omit the corresponding index, which Google
 * interprets as unbounded — matching A1 semantics.
 */
export function a1ToGridRange(sheetId: number, a1: string): GridRange {
  const [startRaw, endRaw] = a1.split(":");
  const start = parseCell(startRaw);
  const end = endRaw ? parseCell(endRaw) : start;
  const range: GridRange = { sheetId };
  if (start.row !== null) range.startRowIndex = start.row - 1;
  if (end.row !== null) range.endRowIndex = end.row;
  if (start.col !== null) range.startColumnIndex = start.col;
  if (end.col !== null) range.endColumnIndex = end.col + 1;
  return range;
}
