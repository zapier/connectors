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
      .describe("Comma-separated fields to match: title, notes, custom_fields.")
      .optional(),
    exact_match: z
      .boolean()
      .describe("Match the full term exactly.")
      .optional(),
    person_id: z
      .number()
      .int()
      .describe("Restrict to a person's deals.")
      .optional(),
    organization_id: z
      .number()
      .int()
      .describe("Restrict to an organization's deals.")
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
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      result_score: z.number().describe("Relevance score.").nullish(),
      item: z
        .object({
          id: z.number().int().describe("Deal id."),
          title: z.string().describe("Deal title.").nullish(),
          value: z.number().describe("Monetary value.").nullish(),
          currency: z
            .string()
            .describe("3-letter ISO currency code.")
            .nullish(),
          status: z.string().describe("open, won, or lost.").nullish(),
        })
        .describe("The matched deal.")
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
  name: "searchDeals",
  title: "Search Deals",
  description:
    "Fuzzy-search deals by term across title, notes, and custom fields. Returns match hits; call getDeal for full detail.",
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
    const url = new URL(`https://api.pipedrive.com/api/v2/deals/search`);
    if (input.term !== undefined) {
      url.searchParams.set("term", String(input.term));
    }
    if (input.fields !== undefined) {
      url.searchParams.set("fields", String(input.fields));
    }
    if (input.exact_match !== undefined) {
      url.searchParams.set("exact_match", String(input.exact_match));
    }
    if (input.person_id !== undefined) {
      url.searchParams.set("person_id", String(input.person_id));
    }
    if (input.organization_id !== undefined) {
      url.searchParams.set("organization_id", String(input.organization_id));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("searchDeals", res);
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
