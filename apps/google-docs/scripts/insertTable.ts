#!/usr/bin/env node
// Authored by the implementation agent: the two-phase exception to the
// one-batchUpdate-Request-per-tool convention. InsertTable creates an empty
// R×C table; the cell indices aren't knowable until the table exists, so run()
// inserts the table, re-reads the document to locate the new table's cells, then
// (if seed content was given) inserts each cell's text DESCENDING by index so an
// earlier insert never invalidates a later cell's index. Index-recomputing —
// validated by the eval harness, not mocks.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate, type BatchUpdateRequest } from "../lib/batchUpdate.ts";
import { DOCS_BASE } from "../lib/constants.ts";
import {
  collectTables,
  type WalkedTable,
  type WireDocument,
} from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";
import { endOfSegment, locationOf } from "../lib/range.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    rows: z.number().int().min(1).describe("Number of rows (>= 1)."),
    columns: z.number().int().min(1).describe("Number of columns (>= 1)."),
    index: z
      .number()
      .int()
      .describe(
        "Position to insert at (>= 1). Omit to append at the end of the body. A newline is inserted before the table.",
      )
      .optional(),
    cells: z
      .array(z.array(z.string()))
      .describe(
        "Optional initial cell contents as a row-major 2D array (cells[row][col]). Cells beyond the table's dimensions are ignored; empty strings are left blank.",
      )
      .optional(),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  success: z.literal(true).describe("The table was created."),
  tableStartIndex: z
    .number()
    .int()
    .describe(
      "Start index of the new table — pass as tableStartIndex to modifyTable.",
    ),
});

async function readTables(
  fetch: typeof globalThis.fetch,
  documentId: string,
): Promise<WalkedTable[]> {
  const url = new URL(
    `${DOCS_BASE}/documents/${encodeURIComponent(documentId)}`,
  );
  url.searchParams.set("includeTabsContent", "true");
  url.searchParams.set(
    "fields",
    "tabs/tabProperties,tabs/documentTab/body/content,tabs/childTabs",
  );
  const res = await googleDocsFetch(
    fetch,
    url.toString(),
    { method: "GET" },
    "insertTable",
  );
  const doc = (await res.json()) as WireDocument;
  return collectTables(doc);
}

const definition = defineTool({
  name: "insertTable",
  title: "Insert Table",
  description:
    "Insert a rows×columns table, optionally seeded with cell contents. Returns the new table's start index for later modifyTable calls. Omit index to append at the end.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    if (input.index !== undefined && input.index < 1) {
      throw new Error(
        `Google Docs insertTable: index must be >= 1 (index 0 is the reserved segment start). Got ${input.index}.`,
      );
    }

    // Phase 1: create the empty table.
    const insertTable: Record<string, unknown> = {
      rows: input.rows,
      columns: input.columns,
    };
    if (input.index !== undefined) {
      insertTable.location = locationOf(input.index, input.tabId);
    } else {
      insertTable.endOfSegmentLocation = endOfSegment(input.tabId);
    }
    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ insertTable }],
      "insertTable",
    );

    // Phase 2: re-read to locate the new table (and its cell indices).
    const tables = (await readTables(ctx.fetch, input.documentId)).filter(
      (t) => input.tabId === undefined || t.tabId === input.tabId,
    );
    if (tables.length === 0) {
      throw new Error(
        "Google Docs insertTable: the table was created but could not be located on re-read.",
      );
    }
    // The table we just inserted: the first at/after the requested index, or the
    // last table when appended at the end.
    const target =
      input.index !== undefined
        ? (tables
            .filter((t) => t.startIndex >= input.index!)
            .sort((a, b) => a.startIndex - b.startIndex)[0] ?? tables[0])
        : tables.sort((a, b) => a.startIndex - b.startIndex).at(-1)!;

    // Phase 3 (optional): fill cells, descending by index.
    if (input.cells) {
      const fills: { startIndex: number; text: string }[] = [];
      for (const cell of target.cells) {
        const text = input.cells[cell.rowIndex]?.[cell.columnIndex];
        if (text) fills.push({ startIndex: cell.startIndex, text });
      }
      if (fills.length > 0) {
        const requests: BatchUpdateRequest[] = fills
          .sort((a, b) => b.startIndex - a.startIndex)
          .map(({ startIndex, text }) => ({
            insertText: { text, location: locationOf(startIndex, input.tabId) },
          }));
        await batchUpdate(ctx.fetch, input.documentId, requests, "insertTable");
      }
    }

    return {
      documentId: input.documentId,
      success: true as const,
      tableStartIndex: target.startIndex,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
