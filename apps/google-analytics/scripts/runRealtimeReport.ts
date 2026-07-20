#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwIfGaError, toPropertyPath } from "../lib/googleAnalytics.ts";

const inputSchema = z
  .object({
    propertyId: z
      .string()
      .describe(
        "GA4 property id — the bare numeric id (e.g. 123456) or the full properties/123456 name from listAccountSummaries. Never the G- measurement id.",
      ),
    dimensions: z
      .array(
        z
          .object({
            name: z
              .string()
              .describe(
                "Dimension API name, e.g. country, city, pagePath, date, sessionSource. Discover valid names with getMetadata.",
              ),
          })
          .strict(),
      )
      .describe(
        "Realtime dimensions, e.g. [{name: country}], [{name: unifiedScreenName}]. Fewer are valid than in runReport.",
      )
      .optional(),
    metrics: z
      .array(
        z
          .object({
            name: z
              .string()
              .describe(
                "Metric API name, e.g. activeUsers, sessions, screenPageViews, eventCount. Discover valid names with getMetadata.",
              ),
            expression: z
              .string()
              .describe(
                "Optional formula for a derived metric, e.g. sessions/activeUsers. Omit for a plain metric.",
              )
              .optional(),
          })
          .strict(),
      )
      .describe(
        "Realtime metrics, e.g. [{name: activeUsers}], [{name: screenPageViews}].",
      ),
    dimensionFilter: z
      .record(z.string(), z.any())
      .describe(
        'Filter rows on dimensions only. A recursive FilterExpression tree — one of `filter` {fieldName, stringFilter|inListFilter|numericFilter|betweenFilter|emptyFilter}, `andGroup`/`orGroup` {expressions:[...]}, or `notExpression`. Example: {"filter":{"fieldName":"country","stringFilter":{"matchType":"EXACT","value":"United States"}}}.',
      )
      .optional(),
    metricFilter: z
      .record(z.string(), z.any())
      .describe(
        "Filter rows on metrics only. Same recursive FilterExpression grammar as dimensionFilter.",
      )
      .optional(),
    limit: z
      .string()
      .describe(
        "Max rows (int64 string). Omitted → connector defaults to 100, which TRUNCATES the report: compare returned rows against rowCount and raise limit for the rest. API max 250000.",
      )
      .optional(),
    metricAggregations: z
      .array(z.enum(["TOTAL", "MINIMUM", "MAXIMUM", "COUNT"]))
      .describe("Summary rows to compute; appear in totals/maximums/minimums.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  dimensionHeaders: z
    .array(
      z.object({
        name: z
          .string()
          .nullable()
          .describe("Dimension column name.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Dimension column names, in order.")
    .optional(),
  metricHeaders: z
    .array(
      z.object({
        name: z.string().nullable().describe("Metric column name.").optional(),
        type: z
          .string()
          .nullable()
          .describe(
            "Value type, e.g. TYPE_INTEGER, TYPE_FLOAT, TYPE_CURRENCY, TYPE_SECONDS. Cast metricValues accordingly.",
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Metric column names + types, in order.")
    .optional(),
  rows: z
    .array(
      z.object({
        dimensionValues: z
          .array(
            z.object({
              value: z
                .string()
                .nullable()
                .describe("Dimension value as a string.")
                .optional(),
            }),
          )
          .nullable()
          .describe("One per dimensionHeaders entry, in order.")
          .optional(),
        metricValues: z
          .array(
            z.object({
              value: z
                .string()
                .nullable()
                .describe(
                  "Metric value as a string — cast per the matching metricHeaders[].type; do not assume a number.",
                )
                .optional(),
            }),
          )
          .nullable()
          .describe("One per metricHeaders entry, in order.")
          .optional(),
      }),
    )
    .nullable()
    .describe(
      "Result rows. All values are strings; aggregate totals are separate (see totals).",
    )
    .optional(),
  totals: z
    .array(
      z.object({
        dimensionValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
        metricValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
      }),
    )
    .nullable()
    .describe(
      "Aggregate total rows, present only when metricAggregations included TOTAL.",
    )
    .optional(),
  maximums: z
    .array(
      z.object({
        dimensionValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
        metricValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
      }),
    )
    .nullable()
    .describe(
      "Per-metric maximum rows, present only when metricAggregations included MAXIMUM.",
    )
    .optional(),
  minimums: z
    .array(
      z.object({
        dimensionValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
        metricValues: z
          .array(z.object({ value: z.string().nullable().optional() }))
          .nullable()
          .optional(),
      }),
    )
    .nullable()
    .describe(
      "Per-metric minimum rows, present only when metricAggregations included MINIMUM.",
    )
    .optional(),
  rowCount: z
    .number()
    .int()
    .nullable()
    .describe(
      "Total matching rows for the query, independent of limit. Realtime has no offset paging — raise limit to see more.",
    )
    .optional(),
  metadata: z
    .object({
      currencyCode: z
        .string()
        .nullable()
        .describe("Currency the report used, ISO 4217.")
        .optional(),
      timeZone: z
        .string()
        .nullable()
        .describe("Property reporting timezone the dates resolved in.")
        .optional(),
      dataLossFromOtherRow: z
        .boolean()
        .nullable()
        .describe(
          "True when high-cardinality values were rolled into an (other) row — per-value totals are incomplete.",
        )
        .optional(),
      subjectToThresholding: z
        .boolean()
        .nullable()
        .describe(
          "True when rows were withheld for privacy (demographics/signals) — visible rows may not sum to totals.",
        )
        .optional(),
    })
    .nullable()
    .describe("Report caveats — read before trusting numbers.")
    .optional(),
  propertyQuota: z
    .object({
      tokensPerDay: z
        .object({
          consumed: z
            .number()
            .int()
            .nullable()
            .describe("Tokens used.")
            .optional(),
          remaining: z
            .number()
            .int()
            .nullable()
            .describe("Tokens left.")
            .optional(),
        })
        .nullable()
        .describe("Daily token bucket.")
        .optional(),
      tokensPerHour: z
        .object({
          consumed: z
            .number()
            .int()
            .nullable()
            .describe("Tokens used.")
            .optional(),
          remaining: z
            .number()
            .int()
            .nullable()
            .describe("Tokens left.")
            .optional(),
        })
        .nullable()
        .describe("Hourly token bucket.")
        .optional(),
      concurrentRequests: z
        .object({
          consumed: z
            .number()
            .int()
            .nullable()
            .describe("In-flight requests.")
            .optional(),
          remaining: z
            .number()
            .int()
            .nullable()
            .describe("Slots left.")
            .optional(),
        })
        .nullable()
        .describe("Concurrent-request bucket.")
        .optional(),
      serverErrorsPerProjectPerHour: z
        .object({
          consumed: z.number().int().nullable().describe("Used.").optional(),
          remaining: z.number().int().nullable().describe("Left.").optional(),
        })
        .nullable()
        .describe("Per-project hourly server-error bucket.")
        .optional(),
      potentiallyThresholdedRequestsPerHour: z
        .object({
          consumed: z.number().int().nullable().describe("Used.").optional(),
          remaining: z.number().int().nullable().describe("Left.").optional(),
        })
        .nullable()
        .describe("Hourly bucket for requests that may trigger thresholding.")
        .optional(),
      tokensPerProjectPerHour: z
        .object({
          consumed: z
            .number()
            .int()
            .nullable()
            .describe("Tokens used.")
            .optional(),
          remaining: z
            .number()
            .int()
            .nullable()
            .describe("Tokens left.")
            .optional(),
        })
        .nullable()
        .describe("Per-project hourly token bucket.")
        .optional(),
    })
    .nullable()
    .describe(
      "Remaining Data API quota, present only when returnPropertyQuota was true.",
    )
    .optional(),
});

const definition = defineTool({
  name: "runRealtimeReport",
  title: "Run Realtime Report",
  description:
    "Run a realtime GA4 report over roughly the last 30 minutes of activity. No date ranges (realtime is now-relative); a smaller dimension/metric set than runReport. Use for live activity, not historical analysis.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-analytics",
  run: async (input, ctx) => {
    const url = `https://analyticsdata.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}:runRealtimeReport`;
    const body: Record<string, unknown> = {};
    if (input.dimensions !== undefined) body["dimensions"] = input.dimensions;
    if (input.metrics !== undefined) body["metrics"] = input.metrics;
    if (input.dimensionFilter !== undefined)
      body["dimensionFilter"] = input.dimensionFilter;
    if (input.metricFilter !== undefined)
      body["metricFilter"] = input.metricFilter;
    // GA4's limit is an int64 STRING. Default to a modest 100 rows when omitted
    // (Q5, revised 2026-07-15): a bounded default keeps payloads inside an agent's
    // context budget, with truncation signalled via rowCount + the description.
    body["limit"] = input.limit ?? "100";
    if (input.metricAggregations !== undefined)
      body["metricAggregations"] = input.metricAggregations;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "runRealtimeReport");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
