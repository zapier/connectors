#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { searchGaql } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only (strip dashes). From listAccessibleCustomers or listCustomerClients.",
      ),
    query: z
      .string()
      .describe(
        "Full GAQL: SELECT <fields> FROM <oneResource> WHERE ... ORDER BY ... LIMIT ... . Exactly one resource per FROM, no JOINs. Dates: segments.date DURING LAST_7_DAYS. Money fields are micros. Discover valid fields with listSearchableFields.",
      ),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's nextPageToken; omit for the first page.",
      )
      .optional(),
    loginCustomerId: z
      .string()
      .describe(
        "Manager (MCC) account id, digits only. Required only when the operating account is reached through a manager account; omit for direct access.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  results: z
    .array(z.record(z.string(), z.json()))
    .describe("Rows; each row's fields mirror the SELECT clause of the query."),
  nextPageToken: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
  fieldMask: z
    .string()
    .describe("The selected fields, echoed back.")
    .optional(),
});

const definition = defineTool({
  name: "search",
  title: "Search",
  description:
    "Run any Google Ads report via a GAQL query. Use for reads the structured list/report tools don't cover: custom field sets, filters, segmentation, or resources beyond campaigns/ad groups/ads. Discover valid fields with listSearchableFields.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (input, ctx) =>
    searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query: input.query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "search",
    }),
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
