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
    query: z.string().max(500).describe("The search query."),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max results to return per source (1–100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    sources: z
      .array(z.enum(["web", "news", "images"]))
      .describe(
        'Which result types to search. Defaults to ["web"]. Each requested source returns its own array.',
      )
      .optional(),
    categories: z
      .array(z.enum(["github", "research", "pdf"]))
      .describe(
        "Restrict web results to a category (e.g. github repos, research pages, PDFs).",
      )
      .optional(),
    includeDomains: z
      .array(z.string())
      .describe(
        "Only return results from these domains. Fields `includeDomains` and `excludeDomains` are mutually exclusive — pass at most one.",
      )
      .optional(),
    excludeDomains: z
      .array(z.string())
      .describe(
        "Drop results from these domains. Fields `includeDomains` and `excludeDomains` are mutually exclusive — pass at most one.",
      )
      .optional(),
    tbs: z
      .string()
      .describe(
        "Time filter, e.g. qdr:d (past day), qdr:w (past week), qdr:m, qdr:y.",
      )
      .optional(),
    location: z
      .string()
      .describe(
        'Locale to search from, e.g. "San Francisco,California,United States".',
      )
      .optional(),
    country: z
      .string()
      .describe("ISO country code to geo-target, e.g. US, DE. Defaults to US.")
      .optional(),
    scrapeOptions: z
      .object({
        formats: z
          .array(
            z.enum([
              "markdown",
              "summary",
              "html",
              "rawHtml",
              "links",
              "images",
              "screenshot",
            ]),
          )
          .describe(
            'Output formats to return per page. Defaults to ["markdown"].',
          )
          .optional(),
        onlyMainContent: z
          .boolean()
          .describe(
            "Return only the main content, stripping nav/footer/boilerplate. Defaults to true.",
          )
          .optional(),
        includeTags: z
          .array(z.string())
          .describe("Only include content within these HTML tags/selectors.")
          .optional(),
        excludeTags: z
          .array(z.string())
          .describe("Strip content within these HTML tags/selectors.")
          .optional(),
        maxAge: z
          .number()
          .int()
          .describe(
            "Return a cached page younger than this many ms (defaults to 2 days). 0 forces a fresh scrape.",
          )
          .optional(),
        waitFor: z
          .number()
          .int()
          .describe("Extra ms to wait for the page to render before scraping.")
          .optional(),
        mobile: z.boolean().describe("Emulate a mobile device.").optional(),
      })
      .strict()
      .describe("How to scrape each page — output formats and content filters.")
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      [input.includeDomains, input.excludeDomains].filter(
        (v) => v !== undefined,
      ).length <= 1,
    {
      message:
        "Fields `includeDomains` and `excludeDomains` are mutually exclusive — pass at most one.",
      path: ["includeDomains"],
    },
  )
  .meta({
    allOf: [{ not: { required: ["includeDomains", "excludeDomains"] } }],
  });
const outputSchema = z.object({
  web: z
    .array(
      z.object({
        title: z.string().nullable().optional(),
        description: z
          .string()
          .nullable()
          .describe("Result snippet, or a query-relevant highlight.")
          .optional(),
        url: z.string(),
        markdown: z
          .string()
          .nullable()
          .describe(
            "Page content as Markdown (only when scrapeOptions requested it).",
          )
          .optional(),
      }),
    )
    .nullable()
    .optional(),
  news: z
    .array(
      z.object({
        title: z.string().nullable().optional(),
        snippet: z.string().nullable().optional(),
        url: z.string(),
        date: z.string().nullable().optional(),
        markdown: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  images: z
    .array(
      z.object({
        title: z.string().nullable().optional(),
        imageUrl: z.string(),
        url: z.string().nullable().optional(),
        position: z.number().int().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "search",
  title: "Search",
  description:
    "Search the web and get ranked results; optionally scrape each result's content by passing scrapeOptions. Use to find pages when you don't already have the URL.",
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
    const url = `https://api.firecrawl.dev/v2/search`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    body["limit"] = input.limit ?? 10;
    if (input.sources !== undefined) body["sources"] = input.sources;
    if (input.categories !== undefined) body["categories"] = input.categories;
    if (input.includeDomains !== undefined)
      body["includeDomains"] = input.includeDomains;
    if (input.excludeDomains !== undefined)
      body["excludeDomains"] = input.excludeDomains;
    if (input.tbs !== undefined) body["tbs"] = input.tbs;
    if (input.location !== undefined) body["location"] = input.location;
    if (input.country !== undefined) body["country"] = input.country;
    if (input.scrapeOptions !== undefined)
      body["scrapeOptions"] = input.scrapeOptions;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl search");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
