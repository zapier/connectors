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
    id: z.string().describe("The seed paperId from searchPapers."),
    intent: z
      .string()
      .min(1)
      .describe("Natural-language description of what related work you want."),
    mode: z
      .enum(["similar", "citers", "references"])
      .describe(
        "Expansion mode — similar (default) = related neighborhood; citers = papers citing the seed; references = papers the seed cites.",
      )
      .optional(),
    k: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Max related papers (1–500). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z.array(
    z
      .object({
        paperId: z
          .string()
          .describe(
            "Canonical paper id. Pass to readPaper or findRelatedPapers.",
          ),
        primaryId: z
          .string()
          .nullable()
          .describe("Source id, e.g. arxiv:2105.05233, pmid:123, doi:10.1/x.")
          .optional(),
        title: z.string(),
        abstract: z.string().nullable().optional(),
        score: z.number().nullable().optional(),
      })
      .describe("A research paper match."),
  ),
  poolSize: z.number().int().nullable().optional(),
  truncated: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "findRelatedPapers",
  title: "Find Related Papers",
  description:
    "Find papers related to a seed paper — similar work, papers citing it, or papers it cites — ranked by a natural-language intent. Get the seed id from searchPapers.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = new URL(
      `https://api.firecrawl.dev/v2/search/research/papers/${encodeURIComponent(input.id)}/similar`,
    );
    if (input.intent !== undefined) {
      url.searchParams.set("intent", String(input.intent));
    }
    if (input.mode !== undefined) {
      url.searchParams.set("mode", String(input.mode));
    }
    url.searchParams.set("k", String(input.k ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl findRelatedPapers");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
