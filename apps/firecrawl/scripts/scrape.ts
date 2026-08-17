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
    url: z.string().describe("The absolute http(s) URL to scrape."),
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
          "json",
        ]),
      )
      .describe(
        'Output formats to return. Defaults to ["markdown"]. summary = LLM summary; screenshot = 24h URL; json = structured extraction (set jsonPrompt and/or jsonSchema).',
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
      .describe("Only include content within these HTML tags/CSS selectors.")
      .optional(),
    excludeTags: z
      .array(z.string())
      .describe("Strip content within these HTML tags/CSS selectors.")
      .optional(),
    headers: z
      .record(z.string(), z.string())
      .describe("Extra request headers to send (cookies, user-agent, etc.).")
      .optional(),
    waitFor: z
      .number()
      .int()
      .describe("Extra ms to wait for the page to render before scraping.")
      .optional(),
    timeout: z
      .number()
      .int()
      .gte(1000)
      .lte(300000)
      .describe("Request timeout in ms (1000–300000). Defaults to 60000.")
      .optional(),
    mobile: z.boolean().describe("Emulate a mobile device.").optional(),
    maxAge: z
      .number()
      .int()
      .describe(
        "Return a cached page younger than this many ms (defaults to 2 days, faster). 0 forces a fresh scrape.",
      )
      .optional(),
    proxy: z
      .enum(["basic", "enhanced", "auto"])
      .describe(
        "Proxy strategy. 'auto' (default) retries with a tougher proxy on failure; 'enhanced' can cost extra credits.",
      )
      .optional(),
    blockAds: z
      .boolean()
      .describe("Block ads and cookie-consent popups. Defaults to true.")
      .optional(),
    location: z
      .object({
        country: z
          .string()
          .describe(
            "ISO 3166-1 alpha-2 country code, e.g. US, DE. Defaults to US.",
          )
          .optional(),
        languages: z
          .array(z.string())
          .describe('Accept-Language locales, e.g. ["en-US"].')
          .optional(),
      })
      .strict()
      .describe("Geographic origin for the request.")
      .optional(),
    jsonPrompt: z
      .string()
      .describe(
        "Natural-language instruction for structured extraction. Used when 'json' is in formats. Result comes back in the output's json field.",
      )
      .optional(),
    jsonSchema: z
      .record(z.string(), z.any())
      .describe(
        "JSON Schema describing the structured data to extract. Used when 'json' is in formats. Combine with jsonPrompt or use alone.",
      )
      .optional(),
    actions: z
      .array(
        z
          .object({
            type: z
              .enum([
                "wait",
                "click",
                "write",
                "press",
                "scroll",
                "screenshot",
                "scrape",
                "executeJavascript",
              ])
              .describe("The action to perform before scraping."),
            selector: z
              .string()
              .describe("CSS selector for click/write/scroll/wait-for-element.")
              .optional(),
            milliseconds: z
              .number()
              .int()
              .describe("Duration for a wait action.")
              .optional(),
            text: z
              .string()
              .describe(
                "Text to type for a write action (click to focus first).",
              )
              .optional(),
            key: z
              .string()
              .describe("Key to send for a press action, e.g. Enter.")
              .optional(),
            direction: z
              .enum(["up", "down"])
              .describe("Scroll direction for a scroll action.")
              .optional(),
            script: z
              .string()
              .describe("JavaScript to run for an executeJavascript action.")
              .optional(),
          })
          .strict(),
      )
      .describe(
        'Browser actions to run in order before scraping — dismiss a modal, click "load more", fill a field. Each item needs a type.',
      )
      .optional(),
  })
  .strict();
const outputSchema = z
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
      .describe("Unmodified HTML (present when 'rawHtml' is requested).")
      .optional(),
    links: z
      .array(z.string())
      .nullable()
      .describe("Links found on the page (present when 'links' is requested).")
      .optional(),
    screenshot: z
      .string()
      .nullable()
      .describe(
        "Screenshot URL, expires after 24h (present when 'screenshot' is requested).",
      )
      .optional(),
    json: z
      .record(z.string(), z.any())
      .nullable()
      .describe(
        "Structured data extracted per jsonPrompt/jsonSchema (present when 'json' is requested).",
      )
      .optional(),
    metadata: z
      .object({
        title: z.string().nullable().describe("Page title.").optional(),
        description: z
          .string()
          .nullable()
          .describe("Page meta description.")
          .optional(),
        language: z.string().nullable().optional(),
        sourceURL: z.string().describe("The URL originally requested."),
        url: z
          .string()
          .nullable()
          .describe("The final URL after redirects.")
          .optional(),
        statusCode: z
          .number()
          .int()
          .describe(
            "HTTP status the page returned. A 200 field can still carry a 403/404 here — check it.",
          ),
        contentType: z.string().nullable().optional(),
        numPages: z
          .number()
          .int()
          .nullable()
          .describe("PDF pages parsed (PDF sources only).")
          .optional(),
        error: z.string().nullable().optional(),
      })
      .nullable()
      .describe("Page metadata for a scraped document.")
      .optional(),
  })
  .describe("A scraped page rendered as clean, LLM-ready content.");

const definition = defineTool({
  name: "scrape",
  title: "Scrape",
  description:
    "Scrape one URL and return clean, LLM-ready content (Markdown by default). The fastest way to read a single known page. For many URLs use batchScrape; to follow links use crawl.",
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
    const url = `https://api.firecrawl.dev/v2/scrape`;
    const body: Record<string, unknown> = {};
    if (input.url !== undefined) body["url"] = input.url;
    if (input.formats !== undefined) body["formats"] = input.formats;
    if (input.onlyMainContent !== undefined)
      body["onlyMainContent"] = input.onlyMainContent;
    if (input.includeTags !== undefined)
      body["includeTags"] = input.includeTags;
    if (input.excludeTags !== undefined)
      body["excludeTags"] = input.excludeTags;
    if (input.headers !== undefined) body["headers"] = input.headers;
    if (input.waitFor !== undefined) body["waitFor"] = input.waitFor;
    if (input.timeout !== undefined) body["timeout"] = input.timeout;
    if (input.mobile !== undefined) body["mobile"] = input.mobile;
    if (input.maxAge !== undefined) body["maxAge"] = input.maxAge;
    if (input.proxy !== undefined) body["proxy"] = input.proxy;
    if (input.blockAds !== undefined) body["blockAds"] = input.blockAds;
    if (input.location !== undefined) body["location"] = input.location;
    if (input.jsonPrompt !== undefined) body["jsonPrompt"] = input.jsonPrompt;
    if (input.jsonSchema !== undefined) body["jsonSchema"] = input.jsonSchema;
    if (input.actions !== undefined) body["actions"] = input.actions;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl scrape");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
