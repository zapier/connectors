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
    urls: z.array(z.string()).describe("The absolute http(s) URLs to scrape."),
    ignoreInvalidURLs: z
      .boolean()
      .describe(
        "Skip invalid URLs (returned in invalidURLs) instead of failing the whole request. Defaults to true.",
      )
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
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .describe(
      "The batch job id — pass to getBatchScrapeStatus, getBatchScrapeErrors, or cancelBatchScrape.",
    ),
  url: z.string().nullable().optional(),
  invalidURLs: z
    .union([
      z
        .array(z.string())
        .describe(
          "URLs that were dropped as invalid (when ignoreInvalidURLs is true).",
        ),
      z
        .null()
        .describe(
          "URLs that were dropped as invalid (when ignoreInvalidURLs is true).",
        ),
    ])
    .describe(
      "URLs that were dropped as invalid (when ignoreInvalidURLs is true).",
    )
    .optional(),
});

const definition = defineTool({
  name: "batchScrape",
  title: "Batch Scrape",
  description:
    "Start an async job that scrapes a fixed list of URLs. Returns a job id — poll getBatchScrapeStatus for results. Use crawl instead to follow links from a site.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/batch/scrape`;
    const body: Record<string, unknown> = {};
    if (input.urls !== undefined) body["urls"] = input.urls;
    if (input.ignoreInvalidURLs !== undefined)
      body["ignoreInvalidURLs"] = input.ignoreInvalidURLs;
    if (input.scrapeOptions !== undefined)
      body["scrapeOptions"] = input.scrapeOptions;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl batchScrape");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
