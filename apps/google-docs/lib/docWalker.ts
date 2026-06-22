// Walk the wire Document tree. The Docs API returns a deeply nested structure
// (body.content[].paragraph.elements[].textRun.content), with tabs[] holding
// each tab's own body and childTabs nesting further, and tables nesting
// structural elements inside cells. getDocument and findText share this walker
// so neither silently drops text inside tables or non-first tabs.
//
// Indices are zero-based UTF-16 code units relative to the start of the
// enclosing tab segment; each structural element carries startIndex/endIndex.

interface WireTextRun {
  content?: string;
}
interface WireParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: WireTextRun;
}
interface WireParagraph {
  elements?: WireParagraphElement[];
}
interface WireTableCell {
  content?: WireStructuralElement[];
}
interface WireTableRow {
  tableCells?: WireTableCell[];
}
interface WireTable {
  tableRows?: WireTableRow[];
}
export interface WireStructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: WireParagraph;
  table?: WireTable;
  sectionBreak?: unknown;
  tableOfContents?: unknown;
}
interface WireTab {
  tabProperties?: { tabId?: string; title?: string; index?: number };
  documentTab?: {
    body?: { content?: WireStructuralElement[] };
    inlineObjects?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    footers?: Record<string, unknown>;
    footnotes?: Record<string, unknown>;
  };
  childTabs?: WireTab[];
}
export interface WireDocument {
  documentId?: string;
  title?: string;
  revisionId?: string;
  body?: { content?: WireStructuralElement[] };
  tabs?: WireTab[];
  inlineObjects?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  footers?: Record<string, unknown>;
  footnotes?: Record<string, unknown>;
}

export type ElementType =
  | "paragraph"
  | "table"
  | "sectionBreak"
  | "tableOfContents";

/** One tab's identity + its top-level structural content. */
export interface WalkedTab {
  tabId: string;
  title: string;
  index: number;
  content: WireStructuralElement[];
}

/** A flattened structural element for getDocument's content[]. */
export interface FlatElement {
  startIndex: number;
  endIndex: number;
  tabId: string;
  type: ElementType;
  text: string;
}

/** A located text match for findText. */
export interface TextMatch {
  text: string;
  startIndex: number;
  endIndex: number;
  tabId: string;
}

export function elementType(el: WireStructuralElement): ElementType {
  if (el.table) return "table";
  if (el.sectionBreak) return "sectionBreak";
  if (el.tableOfContents) return "tableOfContents";
  return "paragraph";
}

/** Concatenate a paragraph's text-run contents (includes the trailing newline). */
function paragraphText(p: WireParagraph | undefined): string {
  if (!p?.elements) return "";
  let out = "";
  for (const el of p.elements) {
    if (el.textRun?.content) out += el.textRun.content;
  }
  return out;
}

/** Readable text for a content array, recursing into table cells. */
function flattenContent(content: WireStructuralElement[] | undefined): string {
  if (!content) return "";
  let out = "";
  for (const el of content) {
    if (el.paragraph) {
      out += paragraphText(el.paragraph);
    } else if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          out += flattenContent(cell.content);
        }
      }
    }
  }
  return out;
}

/**
 * Collect every tab (recursing childTabs) with its top-level content. A legacy
 * single-tab document (no `tabs[]`) is normalized to one tab with tabId "".
 */
export function collectTabs(doc: WireDocument): WalkedTab[] {
  if (!doc.tabs || doc.tabs.length === 0) {
    return [
      {
        tabId: "",
        title: doc.title ?? "",
        index: 0,
        content: doc.body?.content ?? [],
      },
    ];
  }
  const out: WalkedTab[] = [];
  const visit = (tab: WireTab): void => {
    out.push({
      tabId: tab.tabProperties?.tabId ?? "",
      title: tab.tabProperties?.title ?? "",
      index: tab.tabProperties?.index ?? out.length,
      content: tab.documentTab?.body?.content ?? [],
    });
    for (const child of tab.childTabs ?? []) visit(child);
  };
  for (const tab of doc.tabs) visit(tab);
  return out;
}

/**
 * Aggregate inlineObjects across all tabs. Used by getDocument so the caller
 * gets a flat map of objectId → properties without needing to know which tab
 * each object lives in. (The tabs model stores inlineObjects per documentTab;
 * the legacy top-level field is blocked when tabs/* fields are also requested.)
 */
export function collectInlineObjects(
  doc: WireDocument,
): Record<string, unknown> {
  if (!doc.tabs || doc.tabs.length === 0) {
    return doc.inlineObjects ?? {};
  }
  const out: Record<string, unknown> = {};
  const visit = (tab: WireTab): void => {
    Object.assign(out, tab.documentTab?.inlineObjects ?? {});
    for (const child of tab.childTabs ?? []) visit(child);
  };
  for (const tab of doc.tabs) visit(tab);
  return out;
}

/** A cell within a walked table: its logical position + text-insertion index. */
export interface WalkedTableCell {
  rowIndex: number;
  columnIndex: number;
  /** Index of the cell's first paragraph — where InsertText puts cell content. */
  startIndex: number;
}

/** A top-level table: its position, dimensions, tab, and cell insertion points. */
export interface WalkedTable {
  /** The table's start index — the tableStartLocation for table-cell requests. */
  startIndex: number;
  endIndex: number;
  tabId: string;
  rows: number;
  columns: number;
  cells: WalkedTableCell[];
}

/**
 * Collect top-level tables across all tabs, with each cell's insertion index.
 * Used by insertTable (to fill cells after creating the table) and getDocument
 * (to expose table dimensions + the tableStartLocation modifyTable needs). Cell
 * text-insertion index is the first structural element inside the cell.
 */
export function collectTables(doc: WireDocument): WalkedTable[] {
  const out: WalkedTable[] = [];
  for (const tab of collectTabs(doc)) {
    for (const el of tab.content) {
      if (!el.table?.tableRows) continue;
      const rows = el.table.tableRows;
      const cells: WalkedTableCell[] = [];
      rows.forEach((row, rowIndex) => {
        (row.tableCells ?? []).forEach((cell, columnIndex) => {
          const first = cell.content?.[0];
          if (typeof first?.startIndex === "number") {
            cells.push({ rowIndex, columnIndex, startIndex: first.startIndex });
          }
        });
      });
      out.push({
        startIndex: el.startIndex ?? 0,
        endIndex: el.endIndex ?? 0,
        tabId: tab.tabId,
        rows: rows.length,
        columns: rows[0]?.tableCells?.length ?? 0,
        cells,
      });
    }
  }
  return out;
}

/** Header / footer / footnote segment ids present in the document. */
export interface DocumentSegments {
  headerIds: string[];
  footerIds: string[];
  footnoteIds: string[];
}

/**
 * Collect every header/footer/footnote segment id (the keys of those maps),
 * across all tabs. These are the `segmentId` values the positional tools target
 * to write into a header/footer/footnote.
 */
export function collectSegments(doc: WireDocument): DocumentSegments {
  const headers = new Set<string>();
  const footers = new Set<string>();
  const footnotes = new Set<string>();
  const add = (
    h?: Record<string, unknown>,
    f?: Record<string, unknown>,
    fn?: Record<string, unknown>,
  ): void => {
    Object.keys(h ?? {}).forEach((id) => headers.add(id));
    Object.keys(f ?? {}).forEach((id) => footers.add(id));
    Object.keys(fn ?? {}).forEach((id) => footnotes.add(id));
  };

  if (!doc.tabs || doc.tabs.length === 0) {
    add(doc.headers, doc.footers, doc.footnotes);
  } else {
    const visit = (tab: WireTab): void => {
      add(
        tab.documentTab?.headers,
        tab.documentTab?.footers,
        tab.documentTab?.footnotes,
      );
      for (const child of tab.childTabs ?? []) visit(child);
    };
    for (const tab of doc.tabs) visit(tab);
  }

  return {
    headerIds: [...headers],
    footerIds: [...footers],
    footnoteIds: [...footnotes],
  };
}

/** Flattened readable text for the whole document (all tabs, tables included). */
export function flattenDocumentText(doc: WireDocument): string {
  return collectTabs(doc)
    .map((t) => flattenContent(t.content))
    .join("");
}

/**
 * Top-level structural elements across all tabs, in document order, with their
 * indices, tab, type, and (for paragraphs) text. Used for getDocument.content[].
 */
export function walkElements(doc: WireDocument): FlatElement[] {
  const out: FlatElement[] = [];
  for (const tab of collectTabs(doc)) {
    for (const el of tab.content) {
      out.push({
        startIndex: el.startIndex ?? 0,
        endIndex: el.endIndex ?? 0,
        tabId: tab.tabId,
        type: elementType(el),
        text: el.paragraph ? paragraphText(el.paragraph) : "",
      });
    }
  }
  return out;
}

/**
 * Find every occurrence of `query` and return its {startIndex, endIndex, tabId}.
 * Walks paragraphs inside tables and every tab; matches are located per
 * paragraph (a match spanning paragraph boundaries is not reported, matching the
 * API's own per-segment search). Index mapping is UTF-16-accurate: each
 * character maps to its text run's startIndex + local offset.
 */
export function findMatches(
  doc: WireDocument,
  query: string,
  matchCase: boolean,
): TextMatch[] {
  if (query.length === 0) return [];
  const matches: TextMatch[] = [];
  const needle = matchCase ? query : query.toLowerCase();

  const searchParagraph = (p: WireParagraph, tabId: string): void => {
    // Build the paragraph text alongside a per-character index map.
    let text = "";
    const indexMap: number[] = [];
    for (const el of p.elements ?? []) {
      const content = el.textRun?.content;
      if (!content || el.startIndex === undefined) continue;
      for (let i = 0; i < content.length; i++) {
        text += content[i];
        indexMap.push(el.startIndex + i);
      }
    }
    const haystack = matchCase ? text : text.toLowerCase();
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      const startIndex = indexMap[at];
      const endIndex = indexMap[at + needle.length - 1] + 1;
      matches.push({
        text: text.slice(at, at + needle.length),
        startIndex,
        endIndex,
        tabId,
      });
      from = at + needle.length;
    }
  };

  const walk = (content: WireStructuralElement[], tabId: string): void => {
    for (const el of content) {
      if (el.paragraph) {
        searchParagraph(el.paragraph, tabId);
      } else if (el.table?.tableRows) {
        for (const row of el.table.tableRows) {
          for (const cell of row.tableCells ?? []) {
            walk(cell.content ?? [], tabId);
          }
        }
      }
    }
  };

  for (const tab of collectTabs(doc)) walk(tab.content, tab.tabId);
  return matches;
}
