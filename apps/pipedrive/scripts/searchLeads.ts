#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    term: z.string().describe("Search term. At least 2 characters."),
    fields: z
      .string()
      .describe("Comma-separated fields: title, notes, custom_fields.")
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
    start: z
      .number()
      .int()
      .describe("Pagination offset (v1 offset pagination).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      result_score: z.number().describe("Relevance score.").nullish(),
      item: z
        .object({
          id: z
            .string()
            .describe("Lead id (UUID). Pass to getLead for full detail."),
          title: z.string().describe("Lead title.").nullish(),
        })
        .describe(
          "The matched lead (a search-hit summary, not the full record). Call getLead with item.id for full detail.",
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
  name: "searchLeads",
  title: "Search Leads",
  description:
    "Fuzzy-search leads by term across title, notes, and custom fields. Returns match hits; call getLead for detail.",
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
    const url = new URL(`https://api.pipedrive.com/v1/leads/search`);
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
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("searchLeads", res);
    const data = wire.data as { items?: unknown } | undefined;
    const pag = wire.additional_data as
      | { pagination?: { next_start?: number | null } }
      | undefined;
    return {
      items: data?.items,
      next_start: pag?.pagination?.next_start ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
