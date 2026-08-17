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
    query: z.string().min(1).describe("Natural-language paper search query."),
    k: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Max papers to return (1–500). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    authors: z
      .string()
      .describe(
        "Author substring filter; comma-separate for multiple (all must match).",
      )
      .optional(),
    categories: z
      .string()
      .describe("Category filter, e.g. cs.LG; comma-separate for multiple.")
      .optional(),
    from: z
      .string()
      .date()
      .describe("Inclusive lower bound on paper date (YYYY-MM-DD).")
      .optional(),
    to: z
      .string()
      .date()
      .describe("Inclusive upper bound on paper date (YYYY-MM-DD).")
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
});

const definition = defineTool({
  name: "searchPapers",
  title: "Search Papers",
  description:
    "Search Firecrawl's academic index (arXiv, PubMed, bioRxiv, medRxiv) with a natural-language query. Returns ranked papers; pass a paperId to readPaper or findRelatedPapers.",
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
    const url = new URL(`https://api.firecrawl.dev/v2/search/research/papers`);
    if (input.query !== undefined) {
      url.searchParams.set("query", String(input.query));
    }
    url.searchParams.set("k", String(input.k ?? 20));
    if (input.authors !== undefined) {
      url.searchParams.set("authors", String(input.authors));
    }
    if (input.categories !== undefined) {
      url.searchParams.set("categories", String(input.categories));
    }
    if (input.from !== undefined) {
      url.searchParams.set("from", String(input.from));
    }
    if (input.to !== undefined) {
      url.searchParams.set("to", String(input.to));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl searchPapers");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
