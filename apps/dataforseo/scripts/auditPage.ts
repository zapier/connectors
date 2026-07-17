#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    url: z
      .string()
      .describe(
        'Absolute URL of the page to audit, e.g. "https://example.com/page".',
      ),
    enable_javascript: z
      .boolean()
      .describe("Execute page JavaScript during the audit.")
      .optional(),
    enable_browser_rendering: z
      .boolean()
      .describe("Emulate full browser rendering (implies JavaScript).")
      .optional(),
    custom_user_agent: z
      .string()
      .describe("Custom User-Agent header for the crawl.")
      .optional(),
    accept_language: z
      .string()
      .describe('Accept-Language header for the crawl, e.g. "en-US".')
      .optional(),
    load_resources: z
      .boolean()
      .describe("Load images, CSS, JS, and detect broken resources.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z
    .number()
    .int()
    .describe("Number of pages returned (usually 1)."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        url: z.string().nullable().describe("Audited URL.").optional(),
        onpage_score: z
          .number()
          .nullable()
          .describe("Overall on-page score")
          .optional(),
        meta: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        page_timing: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        checks: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Audited pages.")
    .optional(),
});

const definition = defineTool({
  name: "auditPage",
  title: "Audit Page",
  description:
    "Run an instant on-page SEO audit of a single URL: on-page checks, load timing, and score. Use to diagnose how well a page is optimized.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dataforseo",
  run: async (input, ctx) => {
    const params: Record<string, unknown> = {};
    if (input.url !== undefined) params["url"] = input.url;
    if (input.enable_javascript !== undefined)
      params["enable_javascript"] = input.enable_javascript;
    if (input.enable_browser_rendering !== undefined)
      params["enable_browser_rendering"] = input.enable_browser_rendering;
    if (input.custom_user_agent !== undefined)
      params["custom_user_agent"] = input.custom_user_agent;
    if (input.accept_language !== undefined)
      params["accept_language"] = input.accept_language;
    if (input.load_resources !== undefined)
      params["load_resources"] = input.load_resources;
    return dataforseoLive(
      ctx.fetch,
      "/v3/on_page/instant_pages",
      params,
      "DataForSEO auditPage",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
