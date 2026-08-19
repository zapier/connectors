#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { splitQuery, toApiDate } from "../lib/perplexity.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        "What to search for, in natural language. Put several related queries on separate lines to run them together in one request.",
      ),
    max_results: z
      .number()
      .int()
      .gte(1)
      .lte(20)
      .describe(
        "Maximum number of results to return per query (1–20). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    search_domain_filter: z
      .array(z.string())
      .describe(
        'Limit results to these domains; prefix a domain with "-" to exclude it. Max 20.',
      )
      .optional(),
    search_recency_filter: z
      .enum(["hour", "day", "week", "month", "year"])
      .describe("Only return results published within this window.")
      .optional(),
    search_after_date_filter: z
      .string()
      .describe(
        "Only return results published on or after this date. Format MM/DD/YYYY.",
      )
      .optional(),
    search_before_date_filter: z
      .string()
      .describe(
        "Only return results published on or before this date. Format MM/DD/YYYY.",
      )
      .optional(),
    last_updated_after_filter: z
      .string()
      .describe(
        "Only return results last updated on or after this date. Format MM/DD/YYYY.",
      )
      .optional(),
    last_updated_before_filter: z
      .string()
      .describe(
        "Only return results last updated on or before this date. Format MM/DD/YYYY.",
      )
      .optional(),
    country: z
      .string()
      .min(2)
      .max(2)
      .describe(
        'Bias results to a country using its 2-letter ISO code (e.g. "US").',
      )
      .optional(),
    search_language_filter: z
      .array(z.string())
      .describe(
        'Limit results to these languages using 2-letter ISO 639-1 codes (e.g. ["en", "fr"]). Max 20.',
      )
      .optional(),
    max_tokens_per_page: z
      .number()
      .int()
      .gte(1)
      .lte(1000000)
      .describe("Maximum content tokens to extract from each result page.")
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            title: z.string().describe("Title of the result page."),
            url: z.string().describe("URL of the result page."),
            snippet: z
              .string()
              .describe("Content excerpt extracted from the page."),
            date: z
              .string()
              .nullable()
              .describe("Publication date of the page (YYYY-MM-DD when known).")
              .optional(),
            last_updated: z
              .string()
              .nullable()
              .describe(
                "Date the page was last updated (YYYY-MM-DD when known).",
              )
              .optional(),
          })
          .describe("One ranked web result."),
      )
      .describe("The ranked results, best first."),
    id: z.string().describe("Unique identifier for this search request."),
  })
  .describe("Ranked web results for the query.");

const definition = defineTool({
  name: "search",
  title: "Search",
  description:
    "Search the web and get a ranked list of pages with titles, URLs, and content snippets. Reach for this when you want the source results themselves rather than a synthesized answer.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "perplexity",
  run: async (input, ctx) => {
    const url = `https://api.perplexity.ai/search`;
    const body: Record<string, unknown> = {};
    // Split a newline-separated query into a batch (multiple lines) or a plain string.
    body["query"] = splitQuery(input.query);
    body["max_results"] = input.max_results ?? 10;
    if (input.search_domain_filter !== undefined)
      body["search_domain_filter"] = input.search_domain_filter;
    if (input.search_recency_filter !== undefined)
      body["search_recency_filter"] = input.search_recency_filter;
    // Date filters take MM/DD/YYYY on the wire; accept ISO YYYY-MM-DD too.
    if (input.search_after_date_filter !== undefined)
      body["search_after_date_filter"] = toApiDate(
        input.search_after_date_filter,
      );
    if (input.search_before_date_filter !== undefined)
      body["search_before_date_filter"] = toApiDate(
        input.search_before_date_filter,
      );
    if (input.last_updated_after_filter !== undefined)
      body["last_updated_after_filter"] = toApiDate(
        input.last_updated_after_filter,
      );
    if (input.last_updated_before_filter !== undefined)
      body["last_updated_before_filter"] = toApiDate(
        input.last_updated_before_filter,
      );
    if (input.country !== undefined) body["country"] = input.country;
    if (input.search_language_filter !== undefined)
      body["search_language_filter"] = input.search_language_filter;
    if (input.max_tokens_per_page !== undefined)
      body["max_tokens_per_page"] = input.max_tokens_per_page;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Perplexity search");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
