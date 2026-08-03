#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    page: z
      .number()
      .int()
      .describe("Zero-based page of the index list.")
      .optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Indices per page. Defaults to 100 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      name: z
        .string()
        .describe("Index name — the value other tools take as indexName."),
      entries: z.number().int().nullable().describe("Record count.").optional(),
      dataSize: z.number().int().nullable().optional(),
      fileSize: z.number().int().nullable().optional(),
      lastBuildTimeS: z.number().int().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      primary: z
        .union([
          z.string().describe("Set on a replica index — names its primary."),
          z.null().describe("Set on a replica index — names its primary."),
        ])
        .describe("Set on a replica index — names its primary.")
        .optional(),
    }),
  ),
  nbPages: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "listIndices",
  title: "List Indices",
  description:
    "List the indices in the application. The root resolver for indexName across the connector. Returns record counts and replica relationships.",
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
    const url = new URL(`https://application-id.algolia.net/1/indexes`);
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("hitsPerPage", String(input.hitsPerPage ?? 100));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "listIndices");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
