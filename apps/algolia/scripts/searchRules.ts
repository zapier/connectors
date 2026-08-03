#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to search. From listIndices."),
    query: z
      .string()
      .describe("Text to match rules against; omit to list all.")
      .optional(),
    enabled: z
      .boolean()
      .describe("Restrict to enabled or disabled rules.")
      .optional(),
    page: z.number().int().describe("Zero-based page.").optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Rules per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      conditions: z
        .union([
          z.array(z.any().describe("Nested object — shape passes through.")),
          z.null(),
        ])
        .optional(),
      consequence: z.any().describe("Nested object — shape passes through."),
      description: z.union([z.string(), z.null()]).optional(),
      enabled: z.boolean().nullable().optional(),
    }),
  ),
  nbHits: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "searchRules",
  title: "Search Rules",
  description:
    "Search or list query rules in an index. The resolver for rule objectID (-> getRule / deleteRule). Omit query to list all.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/rules/search`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    if (input.enabled !== undefined) body["enabled"] = input.enabled;
    if (input.page !== undefined) body["page"] = input.page;
    body["hitsPerPage"] = input.hitsPerPage ?? 20;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchRules");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
