// Location / Range builders for batchUpdate requests. Positional edit tools
// (insertText, deleteContentRange, formatText, insertImage, replaceImage) all
// thread an optional tabId into a Location or Range so the edit targets the
// right tab — omitting it (a single-tab document) leaves the field off, which
// the API reads as "tab 1". Threading it in one place keeps the convention
// identical across every positional tool.
//
// `segmentId` selects the segment the indices are relative to: the body (the
// default, an empty segmentId) or a header/footer/footnote segment returned by
// createHeader/createFooter/createFootnote. Each segment has its own 0-based
// index space, so a segment-scoped index is meaningless against the body.

type Location = { index: number; segmentId?: string; tabId?: string };
type Range = {
  startIndex: number;
  endIndex: number;
  segmentId?: string;
  tabId?: string;
};

/** A batchUpdate Location, optionally scoped to a tab and/or a segment. */
export function locationOf(
  index: number,
  tabId?: string,
  segmentId?: string,
): Location {
  const loc: Location = { index };
  if (segmentId) loc.segmentId = segmentId;
  if (tabId) loc.tabId = tabId;
  return loc;
}

/** A batchUpdate Range [startIndex, endIndex), optionally scoped to tab/segment. */
export function rangeOf(
  startIndex: number,
  endIndex: number,
  tabId?: string,
  segmentId?: string,
): Range {
  const range: Range = { startIndex, endIndex };
  if (segmentId) range.segmentId = segmentId;
  if (tabId) range.tabId = tabId;
  return range;
}

/**
 * An end-of-segment insertion location. With no `segmentId` this is the document
 * body (the implicit final position, which dodges the off-by-one against the
 * body's trailing newline); pass a header/footer/footnote id to append there.
 */
export function endOfSegment(
  tabId?: string,
  segmentId?: string,
): { segmentId: string; tabId?: string } {
  return tabId
    ? { segmentId: segmentId ?? "", tabId }
    : { segmentId: segmentId ?? "" };
}
