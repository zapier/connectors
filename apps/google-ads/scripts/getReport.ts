#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { searchGaql } from "../lib/googleAdsFetch.ts";

const DATE_PRESETS = [
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
  "THIS_WEEK_SUN_TODAY",
  "THIS_WEEK_MON_TODAY",
  "LAST_WEEK_SUN_SAT",
  "LAST_WEEK_MON_SUN",
  "THIS_MONTH",
  "LAST_MONTH",
] as const;

const RESOURCE_FIELDS: Record<string, string[]> = {
  campaign: ["campaign.id", "campaign.name"],
  ad_group: ["ad_group.id", "ad_group.name"],
  ad_group_ad: ["ad_group_ad.ad.id", "ad_group_ad.ad.name"],
  customer: ["customer.id", "customer.descriptive_name"],
};

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    resource: z
      .enum(["campaign", "ad_group", "ad_group_ad", "customer"])
      .describe("Report resource. Rows are grouped by this resource."),
    metrics: z
      .array(z.string())
      .min(1)
      .describe(
        'Metric field names WITHOUT the "metrics." prefix, e.g. ["impressions","clicks","cost_micros","conversions"]. cost_micros and other *_micros values are in micros (divide by 1,000,000).',
      ),
    datePreset: z
      .enum(DATE_PRESETS)
      .describe(
        "A preset date range. Provide either datePreset or startDate+endDate, not both. Defaults to LAST_30_DAYS when no date is given.",
      )
      .optional(),
    startDate: z
      .string()
      .describe("Custom range start, YYYY-MM-DD. Requires endDate.")
      .optional(),
    endDate: z
      .string()
      .describe("Custom range end, YYYY-MM-DD. Requires startDate.")
      .optional(),
    segments: z
      .array(z.string())
      .describe(
        'Segment field names WITHOUT the "segments." prefix, e.g. ["date","device"]. Each segment multiplies the row count (one row per resource x segment tuple), so raise limit or page when segmenting or the report may be truncated.',
      )
      .optional(),
    orderBy: z
      .string()
      .describe('A selected field to sort by, e.g. "metrics.clicks".')
      .optional(),
    limit: z
      .number()
      .int()
      .positive()
      .describe(
        "Maximum rows to return. Defaults to 50. A soft cap — raise it or page via pageToken; segmented reports can exceed 50 rows.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's next_page_token; omit for the first page.",
      )
      .optional(),
    loginCustomerId: z
      .string()
      .describe(
        "Manager (MCC) account id, digits only. Required only when the operating account is reached through a manager account; omit for direct access.",
      )
      .optional(),
  })
  .strict()
  .refine((i) => !(i.datePreset && (i.startDate || i.endDate)), {
    message: "Provide either datePreset or startDate+endDate, not both.",
    path: ["datePreset"],
  })
  .refine((i) => Boolean(i.startDate) === Boolean(i.endDate), {
    message: "startDate and endDate must be provided together.",
    path: ["startDate"],
  });

const outputSchema = z.object({
  results: z
    .array(z.record(z.string(), z.json()))
    .describe(
      "One row per resource x segment tuple; each row's fields mirror the requested resource, metrics, and segments.",
    ),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "getReport",
  title: "Get Report",
  description:
    "Build a performance report: pick a resource, the metrics to measure, and an optional segmentation over a date range. For anything this doesn't express, use search with raw GAQL.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  // run() assembles a GAQL query from the structured inputs and calls the shared
  // googleAds:search endpoint; the response is field-masked, so results pass through.
  run: async (input, ctx) => {
    const select = [
      ...RESOURCE_FIELDS[input.resource],
      ...input.metrics.map((m) => `metrics.${m}`),
      ...(input.segments ?? []).map((s) => `segments.${s}`),
    ].join(", ");

    const dateClause = input.startDate
      ? `segments.date BETWEEN '${input.startDate}' AND '${input.endDate}'`
      : `segments.date DURING ${input.datePreset ?? "LAST_30_DAYS"}`;

    let query = `SELECT ${select} FROM ${input.resource} WHERE ${dateClause}`;
    if (input.orderBy) query += ` ORDER BY ${input.orderBy}`;
    query += ` LIMIT ${input.limit ?? 50}`;

    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "getReport",
    });
    return { results, next_page_token: nextPageToken };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
