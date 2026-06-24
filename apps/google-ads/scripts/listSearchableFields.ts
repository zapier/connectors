#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { googleAdsRequest } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    resource: z
      .string()
      .describe(
        "Resource or field prefix to look up, e.g. campaign, ad_group, ad_group_ad, metrics. Returns every field whose name starts with this prefix.",
      ),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's next_page_token; omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string().describe("Field name, e.g. campaign.status."),
        category: z
          .string()
          .describe("RESOURCE, ATTRIBUTE, SEGMENT, or METRIC.")
          .optional(),
        selectable: z.boolean().describe("Can appear in SELECT.").optional(),
        filterable: z.boolean().describe("Can appear in WHERE.").optional(),
        sortable: z.boolean().describe("Can appear in ORDER BY.").optional(),
        data_type: z
          .string()
          .describe("Field data type, e.g. ENUM, INT64, STRING.")
          .optional(),
      }),
    )
    .describe("Field descriptors for the requested resource."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface FieldRow {
  name?: string;
  category?: string;
  selectable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  dataType?: string;
}

const definition = defineTool({
  name: "listSearchableFields",
  title: "List Searchable Fields",
  description:
    "List the selectable, filterable, and sortable fields for a Google Ads resource (e.g. campaign, ad_group, metrics). Call before composing a `search` query to get valid field names.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  // Backed by GoogleAdsFieldService.SearchGoogleAdsFields. run() builds the field-service
  // query from the resource prefix so the agent never has to author it.
  run: async (input, ctx) => {
    const body: Record<string, unknown> = {
      query: `SELECT name, category, selectable, filterable, sortable, data_type WHERE name LIKE '${input.resource}.%'`,
    };
    if (input.pageToken) body.pageToken = input.pageToken;
    const json = await googleAdsRequest<{
      results?: FieldRow[];
      nextPageToken?: string;
    }>(ctx.fetch, {
      path: "/googleAdsFields:search",
      method: "POST",
      body,
      toolName: "listSearchableFields",
    });
    return {
      results: (json.results ?? []).map((f) => ({
        name: f.name ?? "",
        category: f.category,
        selectable: f.selectable,
        filterable: f.filterable,
        sortable: f.sortable,
        data_type: f.dataType,
      })),
      next_page_token: json.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
