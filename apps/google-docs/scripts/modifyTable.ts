#!/usr/bin/env node
// Authored by the implementation agent: batchUpdate-union request types that add
// or remove a table row/column at a cell location. The agent resolves
// tableStartIndex from getDocument (a table element's startIndex) and names the
// reference cell by logical rowIndex/columnIndex. Deleting the last row/column
// deletes the whole table (the API's documented behavior).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { locationOf } from "../lib/range.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    tableStartIndex: z
      .number()
      .int()
      .describe(
        "Start index of the table to modify — a table element's startIndex from getDocument (or insertTable's tableStartIndex).",
      ),
    op: z
      .enum(["insertRow", "insertColumn", "deleteRow", "deleteColumn"])
      .describe("What to do to the table at the reference cell."),
    rowIndex: z
      .number()
      .int()
      .min(0)
      .describe("Zero-based row index of the reference cell."),
    columnIndex: z
      .number()
      .int()
      .min(0)
      .describe("Zero-based column index of the reference cell."),
    insertBelow: z
      .boolean()
      .describe(
        "For insertRow: true inserts below the reference cell's row, false above. Defaults to true.",
      )
      .default(true),
    insertRight: z
      .boolean()
      .describe(
        "For insertColumn: true inserts right of the reference cell's column, false left. Defaults to true.",
      )
      .default(true),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "modifyTable",
  title: "Modify Table",
  description:
    "Add or remove a row or column of an existing table, at a reference cell. Resolve tableStartIndex + the cell's row/column from getDocument. Deleting the last row or column deletes the whole table.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    const tableCellLocation = {
      tableStartLocation: locationOf(input.tableStartIndex, input.tabId),
      rowIndex: input.rowIndex,
      columnIndex: input.columnIndex,
    };

    let request: Record<string, unknown>;
    switch (input.op) {
      case "insertRow":
        request = {
          insertTableRow: { tableCellLocation, insertBelow: input.insertBelow },
        };
        break;
      case "insertColumn":
        request = {
          insertTableColumn: {
            tableCellLocation,
            insertRight: input.insertRight,
          },
        };
        break;
      case "deleteRow":
        request = { deleteTableRow: { tableCellLocation } };
        break;
      case "deleteColumn":
        request = { deleteTableColumn: { tableCellLocation } };
        break;
    }

    await batchUpdate(ctx.fetch, input.documentId, [request], "modifyTable");
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
