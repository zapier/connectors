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
    query: z.string().min(1).describe("Natural-language question or phrase."),
    k: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Number of results to return (1–100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    types: z
      .array(z.enum(["doc", "issue", "pull_request", "readme"]))
      .describe("Which result kinds to search. Defaults to all four.")
      .optional(),
    repos: z
      .array(z.string())
      .describe(
        "Restrict issue/PR/readme results to these repo slugs, e.g. firecrawl/firecrawl.",
      )
      .optional(),
    passages: z
      .number()
      .int()
      .gte(1)
      .lte(5)
      .describe("Matched passages to return per result (1–5).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().nullable().optional(),
      type: z
        .enum(["doc", "issue", "pull_request", "readme"])
        .nullable()
        .optional(),
      url: z.string(),
      title: z.string().nullable().optional(),
      passages: z
        .array(z.object({ text: z.string().nullable().optional() }))
        .nullable()
        .optional(),
    }),
  ),
});

const definition = defineTool({
  name: "searchDeveloper",
  title: "Search Developer",
  description:
    "Search Firecrawl's developer index — GitHub issues, merged PRs, repo READMEs, and curated docs sites — with a natural-language query. Returns ranked results with matched passages.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/search/developer`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    body["k"] = input.k ?? 10;
    if (input.types !== undefined) body["types"] = input.types;
    if (input.repos !== undefined) body["repos"] = input.repos;
    if (input.passages !== undefined) body["passages"] = input.passages;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl searchDeveloper");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
