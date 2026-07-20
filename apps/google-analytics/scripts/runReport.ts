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
        "How to break down the data (rows). At least one; e.g. [{name: country}].",
      ),
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
        "What to measure (columns). At least one; e.g. [{name: activeUsers}].",
      ),
    dateRanges: z
      .array(
        z
          .object({
            startDate: z
              .string()
              .describe(
                "Inclusive start. YYYY-MM-DD, or relative: today, yesterday, NdaysAgo (e.g. 28daysAgo). Resolved in the property's timezone.",
              ),
            endDate: z
              .string()
              .describe(
                "Inclusive end. YYYY-MM-DD, or relative: today, yesterday, NdaysAgo. Resolved in the property's timezone.",
              ),
            name: z
              .string()
              .describe(
                "Optional label for this range, echoed into rows when multiple ranges are given (as the dateRange dimension).",
              )
              .optional(),
          })
          .strict(),
      )
      .describe(
        "1-4 date ranges. e.g. [{startDate: 28daysAgo, endDate: yesterday}].",
      ),
    dimensionFilter: z
      .record(z.string(), z.any())
      .describe(
        'Pre-aggregation filter (WHERE) on dimensions only. A recursive FilterExpression tree — exactly one of `filter` {fieldName, and one of stringFilter/inListFilter/numericFilter/betweenFilter/emptyFilter}, `andGroup`/`orGroup` {expressions:[...]}, or `notExpression`. Example: {"filter":{"fieldName":"country","stringFilter":{"matchType":"EXACT","value":"United States"}}}.',
      )
      .optional(),
    metricFilter: z
      .record(z.string(), z.any())
      .describe(
        'Post-aggregation filter (HAVING) on metrics only. Same recursive FilterExpression grammar as dimensionFilter. Example: {"filter":{"fieldName":"sessions","numericFilter":{"operation":"GREATER_THAN","value":{"int64Value":"100"}}}}.',
      )
      .optional(),
    orderBys: z
      .array(
        z
          .record(z.string(), z.any())
          .describe(
            'One sort key. {metric:{metricName}} to sort by a metric, or {dimension:{dimensionName, orderType}} by a dimension, plus optional desc:true. Example: {"desc":true,"metric":{"metricName":"sessions"}}.',
          ),
      )
      .describe(
        "Sort order. e.g. [{desc: true, metric: {metricName: sessions}}].",
      )
      .optional(),
    limit: z
      .string()
      .describe(
        "Max rows (int64 string). Omitted → connector defaults to 100, which TRUNCATES the report: compare returned rows against rowCount and page with offset for the rest. API max 250000.",
      )
      .optional(),
    offset: z
      .string()
      .describe(
        "0-based row offset for paging. Page until offset >= response rowCount.",
      )
      .optional(),
    metricAggregations: z
      .array(z.enum(["TOTAL", "MINIMUM", "MAXIMUM", "COUNT"]))
      .describe(
        "Summary rows to compute across all rows; results appear in totals/maximums/minimums.",
      )
      .optional(),
    currencyCode: z
      .string()
      .describe(
        "ISO 4217 currency for money metrics, e.g. USD. Omit to use the property's configured currency.",
      )
      .optional(),
    keepEmptyRows: z
      .boolean()
      .describe(
        "Include rows whose metric values are all zero. Defaults to false.",
      )
      .optional(),
    returnPropertyQuota: z
      .boolean()
      .describe(
        "Include remaining Data API quota in the response metadata. Defaults to false.",
      )
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
      "Total matching rows, independent of limit/offset. Page with offset until offset >= rowCount.",
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
  name: "runReport",
  title: "Run Report",
  description:
    "Run a GA4 report: pick dimensions + metrics over date ranges, optionally filtered/sorted. The core analytics tool. Discover valid dimension/metric names with getMetadata; validate combos with checkCompatibility.",
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
    const url = `https://analyticsdata.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}:runReport`;
    const body: Record<string, unknown> = {};
    if (input.dimensions !== undefined) body["dimensions"] = input.dimensions;
    if (input.metrics !== undefined) body["metrics"] = input.metrics;
    if (input.dateRanges !== undefined) body["dateRanges"] = input.dateRanges;
    if (input.dimensionFilter !== undefined)
      body["dimensionFilter"] = input.dimensionFilter;
    if (input.metricFilter !== undefined)
      body["metricFilter"] = input.metricFilter;
    if (input.orderBys !== undefined) body["orderBys"] = input.orderBys;
    // GA4's limit is an int64 STRING. Default to a modest 100 rows when omitted
    // (Q5, revised 2026-07-15): a bounded default keeps report payloads inside an
    // agent's context budget, with truncation signalled via rowCount + the field
    // description so the agent pages with offset for more.
    body["limit"] = input.limit ?? "100";
    if (input.offset !== undefined) body["offset"] = input.offset;
    if (input.metricAggregations !== undefined)
      body["metricAggregations"] = input.metricAggregations;
    if (input.currencyCode !== undefined)
      body["currencyCode"] = input.currencyCode;
    if (input.keepEmptyRows !== undefined)
      body["keepEmptyRows"] = input.keepEmptyRows;
    if (input.returnPropertyQuota !== undefined)
      body["returnPropertyQuota"] = input.returnPropertyQuota;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "runReport");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
