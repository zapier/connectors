// Location / Range builders for batchUpdate requests. Positional edit tools
// (insertText, deleteContentRange, formatText, insertImage, replaceImage) all
// thread an optional tabId into a Location or Range so the edit targets the
// right tab — omitting it (a single-tab document) leaves the field off, which
// the API reads as "tab 1". Threading it in one place keeps the convention
// identical across every positional tool.

/** A batchUpdate Location: an insertion point, optionally scoped to a tab. */
export function locationOf(
  index: number,
  tabId?: string,
): { index: number; tabId?: string } {
  return tabId ? { index, tabId } : { index };
}

/** A batchUpdate Range: [startIndex, endIndex), optionally scoped to a tab. */
export function rangeOf(
  startIndex: number,
  endIndex: number,
  tabId?: string,
): { startIndex: number; endIndex: number; tabId?: string } {
  return tabId ? { startIndex, endIndex, tabId } : { startIndex, endIndex };
}

/** An end-of-body insertion location (the segment's implicit final position). */
export function endOfSegment(tabId?: string): {
  segmentId: string;
  tabId?: string;
} {
  // Empty segmentId = the document body. Appending here dodges the off-by-one
  // against the body's implicit final newline.
  return tabId ? { segmentId: "", tabId } : { segmentId: "" };
}
