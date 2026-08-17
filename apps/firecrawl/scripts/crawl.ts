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
    url: z.string().describe("The base URL to start crawling from."),
    prompt: z
      .string()
      .describe(
        "Natural-language description of what to crawl; Firecrawl derives crawl options from it. Explicit fields below override it.",
      )
      .optional(),
    includePaths: z
      .array(z.string())
      .describe(
        "Only crawl paths matching these regex patterns. The start URL must also match or the crawl may return 0 pages.",
      )
      .optional(),
    excludePaths: z
      .array(z.string())
      .describe("Skip paths matching these regex patterns.")
      .optional(),
    maxDiscoveryDepth: z
      .number()
      .int()
      .describe(
        "Max link-discovery depth. The root and sitemapped pages are depth 0.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .describe(
        "Max pages to crawl. Defaults to 10000. Credits must cover this up front.",
      )
      .optional(),
    sitemap: z
      .enum(["skip", "include", "only"])
      .describe("How to use the site's sitemap. Defaults to 'include'.")
      .optional(),
    crawlEntireDomain: z
      .boolean()
      .describe(
        "Follow sibling and parent links, not just deeper paths. Defaults to false.",
      )
      .optional(),
    allowExternalLinks: z
      .boolean()
      .describe("Follow links to other domains. Defaults to false.")
      .optional(),
    allowSubdomains: z
      .boolean()
      .describe("Follow links to subdomains. Defaults to false.")
      .optional(),
    ignoreQueryParameters: z
      .boolean()
      .describe(
        "Treat URLs differing only by query string as one. Defaults to false.",
      )
      .optional(),
    delay: z
      .number()
      .int()
      .describe(
        "Seconds to wait between page scrapes. Setting it forces concurrency to 1.",
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
      "The crawl job id — pass to getCrawlStatus, getCrawlErrors, or cancelCrawl.",
    ),
  url: z
    .string()
    .nullable()
    .describe("The API URL for this job's status.")
    .optional(),
});

const definition = defineTool({
  name: "crawl",
  title: "Crawl",
  description:
    "Start an async crawl that follows links across a site and scrapes each page. Returns a job id — poll getCrawlStatus. Credits must cover the full limit up front. Use batchScrape for a known URL list.",
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
    const url = `https://api.firecrawl.dev/v2/crawl`;
    const body: Record<string, unknown> = {};
    if (input.url !== undefined) body["url"] = input.url;
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.includePaths !== undefined)
      body["includePaths"] = input.includePaths;
    if (input.excludePaths !== undefined)
      body["excludePaths"] = input.excludePaths;
    if (input.maxDiscoveryDepth !== undefined)
      body["maxDiscoveryDepth"] = input.maxDiscoveryDepth;
    if (input.limit !== undefined) body["limit"] = input.limit;
    if (input.sitemap !== undefined) body["sitemap"] = input.sitemap;
    if (input.crawlEntireDomain !== undefined)
      body["crawlEntireDomain"] = input.crawlEntireDomain;
    if (input.allowExternalLinks !== undefined)
      body["allowExternalLinks"] = input.allowExternalLinks;
    if (input.allowSubdomains !== undefined)
      body["allowSubdomains"] = input.allowSubdomains;
    if (input.ignoreQueryParameters !== undefined)
      body["ignoreQueryParameters"] = input.ignoreQueryParameters;
    if (input.delay !== undefined) body["delay"] = input.delay;
    if (input.scrapeOptions !== undefined)
      body["scrapeOptions"] = input.scrapeOptions;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl crawl");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
