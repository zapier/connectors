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
    id: z
      .string()
      .describe(
        "A paperId or source id (arxiv:, pmid:, doi:) from searchPapers.",
      ),
    query: z
      .string()
      .min(1)
      .describe(
        "If set, return the top full-text passages relevant to this query instead of just metadata.",
      )
      .optional(),
    k: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe("Number of passages to return (1–50). Only used with query.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  paper: z
    .object({
      paperId: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      abstract: z.string().nullable().optional(),
      authors: z.string().nullable().optional(),
      categories: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),
  passages: z
    .array(
      z.object({
        text: z.string().nullable().optional(),
        score: z.number().nullable().optional(),
      }),
    )
    .nullable()
    .describe("Relevant full-text passages (present only in read mode).")
    .optional(),
});

const definition = defineTool({
  name: "readPaper",
  title: "Read Paper",
  description:
    "Get a paper's metadata by id. Pass a query to instead return the top full-text passages most relevant to it (read mode). Get ids from searchPapers.",
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
      `https://api.firecrawl.dev/v2/search/research/papers/${encodeURIComponent(input.id)}`,
    );
    if (input.query !== undefined) {
      url.searchParams.set("query", String(input.query));
    }
    if (input.k !== undefined) {
      url.searchParams.set("k", String(input.k));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl readPaper");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
