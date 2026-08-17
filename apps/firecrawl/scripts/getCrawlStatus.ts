#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ id: z.string().describe("The crawl job id from crawl.") })
  .strict();
const outputSchema = z
  .object({
    status: z
      .enum(["scraping", "completed", "failed", "cancelled"])
      .describe("Job state. Poll until 'completed'."),
    total: z.number().int().nullable().describe("Pages attempted.").optional(),
    completed: z
      .number()
      .int()
      .nullable()
      .describe("Pages successfully scraped so far.")
      .optional(),
    creditsUsed: z.number().int().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    completedAt: z
      .string()
      .nullable()
      .describe("Present once the job reaches a terminal state.")
      .optional(),
    expiresAt: z
      .string()
      .nullable()
      .describe(
        "When these results expire (results are available for 24h after completion).",
      )
      .optional(),
    next: z
      .union([
        z
          .string()
          .describe(
            "Cursor URL for the next chunk of results; present when the job is incomplete or the payload exceeds 10MB. null when this is the last page.",
          ),
        z
          .null()
          .describe(
            "Cursor URL for the next chunk of results; present when the job is incomplete or the payload exceeds 10MB. null when this is the last page.",
          ),
      ])
      .describe(
        "Cursor URL for the next chunk of results; present when the job is incomplete or the payload exceeds 10MB. null when this is the last page.",
      )
      .optional(),
    data: z
      .array(
        z
          .object({
            markdown: z
              .string()
              .nullable()
              .describe("The page content as clean Markdown (default format).")
              .optional(),
            summary: z
              .string()
              .nullable()
              .describe(
                "LLM-generated page summary (present when 'summary' is requested).",
              )
              .optional(),
            html: z
              .string()
              .nullable()
              .describe("Cleaned HTML (present when 'html' is requested).")
              .optional(),
            rawHtml: z
              .string()
              .nullable()
              .describe(
                "Unmodified HTML (present when 'rawHtml' is requested).",
              )
              .optional(),
            links: z
              .array(z.string())
              .nullable()
              .describe(
                "Links found on the page (present when 'links' is requested).",
              )
              .optional(),
            screenshot: z
              .string()
              .nullable()
              .describe(
                "Screenshot URL, expires after 24h (present when 'screenshot' is requested).",
              )
              .optional(),
            json: z
              .any()
              .nullable()
              .describe("Nested object — shape passes through.")
              .optional(),
            metadata: z
              .any()
              .nullable()
              .describe(
                "Nested DocumentMetadata object — shape passes through.",
              )
              .optional(),
          })
          .describe("A scraped page rendered as clean, LLM-ready content."),
      )
      .nullable()
      .describe("Scraped pages available so far.")
      .optional(),
  })
  .describe("Progress and results of an async crawl or batch-scrape job.");

const definition = defineTool({
  name: "getCrawlStatus",
  title: "Get Crawl Status",
  description:
    "Get an async crawl's progress and scraped pages so far. Poll until status is 'completed'. Large result sets page via the returned 'next' cursor. Results expire 24h after completion.",
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
    const url = `https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getCrawlStatus");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
