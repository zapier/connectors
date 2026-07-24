#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ tableId: z.string().describe("Table id, from listTables.") })
  .strict();
const outputSchema = z.object({
  fields: z
    .array(
      z.object({
        id: z
          .string()
          .describe("Field id (f_...) — the key used in cells and filters."),
        name: z.string().nullable().describe("Field label.").optional(),
        type: z
          .enum([
            "text",
            "email",
            "url",
            "number",
            "boolean",
            "date",
            "select",
            "users",
            "image",
            "formula",
            "action",
          ])
          .describe("Field type."),
        options: z
          .array(
            z.object({
              id: z
                .string()
                .describe("Select-option id — use in a cell's optionIds."),
              text: z.string().nullable().describe("Option label.").optional(),
            }),
          )
          .nullable()
          .describe("Select-field options (present when type is 'select').")
          .optional(),
      }),
    )
    .nullable()
    .describe("The table's columns.")
    .optional(),
  views: z
    .array(
      z.object({
        id: z.string().describe("View id."),
        name: z.string().nullable().describe("View name.").optional(),
      }),
    )
    .nullable()
    .describe("The table's views.")
    .optional(),
});

const definition = defineTool({
  name: "getTable",
  title: "Get Table",
  description:
    "Describe a table: its fields (id, type, select options) and views. The resolver for building cells and filters and for picking a viewId.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay getTable");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const table = wirePayload.table;
    // Clay returns a select field's options nested under
    // `typeSettings.dataTypeSettings.options`, but this tool's outputSchema (and
    // its contract — "fields (id, type, select options)") declares them at
    // `fields[].options`. Without this remap, output validation drops the whole
    // `typeSettings` subtree and callers never see the select options.
    const rawFields = Array.isArray(table.fields) ? table.fields : [];
    const fields = rawFields.map((field) => {
      const options = field?.typeSettings?.dataTypeSettings?.options;
      if (!Array.isArray(options)) return field;
      return {
        ...field,
        options: options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      };
    });
    return { ...table, fields };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
