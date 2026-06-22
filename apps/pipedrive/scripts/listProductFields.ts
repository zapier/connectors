#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    start: z.number().int().describe("Pagination offset.").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of field definitions to return. Defaults to 100 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      key: z
        .string()
        .describe(
          "Field key — a 40-char hash for custom fields, or the standard field name.",
        ),
      name: z.string().describe("Human-readable field label."),
      field_type: z
        .string()
        .describe(
          "Field type, e.g. varchar, enum, set, monetary, date, address.",
        )
        .nullish(),
      options: z
        .union([
          z
            .array(
              z.object({
                id: z.union([z.number(), z.string(), z.boolean()]),
                label: z.string(),
              }),
            )
            .describe(
              "For enum/set fields, the selectable options. Writes take the option id, not the label.",
            ),
          z
            .null()
            .describe(
              "For enum/set fields, the selectable options. Writes take the option id, not the label.",
            ),
        ])
        .describe(
          "For enum/set fields, the selectable options. Writes take the option id, not the label.",
        )
        .nullish(),
    }),
  ),
  next_start: z
    .union([
      z.number().int().describe("Offset for the next page; null when none."),
      z.null().describe("Offset for the next page; null when none."),
    ])
    .describe("Offset for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "listProductFields",
  title: "List Product Fields",
  description:
    "List product field definitions (standard and custom). Maps a custom-field name to its 40-char key and enum/set option ids.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = new URL(`https://api.pipedrive.com/v1/productFields`);
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    url.searchParams.set("limit", String(input.limit ?? 100));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listProductFields", res);
    const additional = wire.additional_data as
      | { pagination?: { next_start?: number | null } }
      | undefined;
    return {
      items: wire.data,
      next_start: additional?.pagination?.next_start ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
