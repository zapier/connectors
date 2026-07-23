#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    tableId: z.string().describe("Table id, from listTables."),
    filters: z
      .record(z.string(), z.any())
      .describe(
        'Field id -> value to match, e.g. { "f_company": "Acme" }. Field ids come from getTable.',
      ),
    limit: z.number().int().describe("Maximum rows to return.").optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().describe("The record's id."),
        cells: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Matching rows.")
    .optional(),
});

const definition = defineTool({
  name: "findRecord",
  title: "Find Record",
  description:
    "Find rows in a table by matching field values. Pass a map of field id (from getTable) to the value to match; all conditions are AND-combined.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    // Clay's /find endpoint takes a nested filter DSL, not a flat map. Fetch the
    // table schema to resolve each field's type, then map { fieldId: value } to
    // the per-type operator and assemble { type: "AND", operands: [...] }.
    const schemaRes = await ctx.fetch(
      `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}`,
      { method: "GET" },
    );
    await throwIfNotOk(schemaRes, "Clay findRecord (schema)");
    const schema = (await schemaRes.json()) as {
      table?: { fields?: Array<{ id: string; type?: string }> };
    };
    const fieldTypes = new Map(
      (schema.table?.fields ?? []).map((f) => [f.id, f.type]),
    );

    const operands = Object.entries(input.filters).map(([fieldId, value]) => {
      const filterConfig: Record<string, unknown> = {
        type: "OPERATOR",
        operator: "EQUAL",
        value,
      };
      switch (fieldTypes.get(fieldId)) {
        case "select":
          filterConfig.operator = "SELECT_EQUAL";
          break;
        case "users":
          filterConfig.operator = "USER_EQUAL";
          break;
        case "boolean":
          filterConfig.operator = value ? "CHECKED" : "NOT_CHECKED";
          delete filterConfig.value;
          break;
        case "image":
          filterConfig.operator = value ? "NOT_EMPTY" : "EMPTY";
          delete filterConfig.value;
          break;
      }
      return { fieldId, type: "FIELD", filterConfig };
    });

    const url = new URL(
      `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}/find`,
    );
    if (input.limit !== undefined) {
      url.searchParams.set("limit", String(input.limit));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { type: "AND", operands } }),
    });
    await throwIfNotOk(res, "Clay findRecord");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
