#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    term: z
      .string()
      .describe("Search term. At least 2 characters (1 with exact_match)."),
    fields: z
      .string()
      .describe("Comma-separated fields: name, address, notes, custom_fields.")
      .optional(),
    exact_match: z
      .boolean()
      .describe("Match the full term exactly.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Maximum number of hits to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z.string().describe("Pagination cursor.").optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      result_score: z.number().describe("Relevance score.").nullish(),
      item: z
        .object({
          id: z.number().int().describe("Organization id."),
          name: z.string().describe("Organization name.").nullish(),
          address: z
            .string()
            .describe("Organization address, if set.")
            .nullish(),
          owner_id: z.number().int().describe("Owning user id.").nullish(),
        })
        .describe(
          "The matched organization. Call getOrganization for full detail.",
        )
        .nullish(),
    }),
  ),
  next_cursor: z
    .union([
      z.string().describe("Cursor for the next page; null when none."),
      z.null().describe("Cursor for the next page; null when none."),
    ])
    .describe("Cursor for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "searchOrganizations",
  title: "Search Organizations",
  description:
    "Fuzzy-search organizations by term across name, address, notes, and custom fields. Returns match hits; call getOrganization for detail.",
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
    const url = new URL(
      `https://api.pipedrive.com/api/v2/organizations/search`,
    );
    if (input.term !== undefined) {
      url.searchParams.set("term", String(input.term));
    }
    if (input.fields !== undefined) {
      url.searchParams.set("fields", String(input.fields));
    }
    if (input.exact_match !== undefined) {
      url.searchParams.set("exact_match", String(input.exact_match));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("searchOrganizations", res);
    const data = wire.data as { items?: unknown };
    const additional = wire.additional_data as
      | { next_cursor?: string | null }
      | undefined;
    return {
      items: data.items,
      next_cursor: additional?.next_cursor ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
