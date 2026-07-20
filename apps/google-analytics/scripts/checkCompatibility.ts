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
      .describe("Dimensions to test together.")
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
      .describe("Metrics to test together.")
      .optional(),
    compatibilityFilter: z
      .enum(["COMPATIBLE", "INCOMPATIBLE"])
      .describe(
        "Return only fields with this compatibility. Omit to return all.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  dimensionCompatibilities: z
    .array(
      z.object({
        dimensionMetadata: z
          .object({
            apiName: z
              .string()
              .nullable()
              .describe(
                "Dimension API name, e.g. sessionSource — drop this from runReport if compatibility is INCOMPATIBLE.",
              )
              .optional(),
            uiName: z
              .string()
              .nullable()
              .describe("Human name shown in the GA4 UI.")
              .optional(),
            description: z
              .string()
              .nullable()
              .describe("What the dimension means.")
              .optional(),
            category: z
              .string()
              .nullable()
              .describe("Grouping, e.g. Traffic Sources.")
              .optional(),
            deprecatedApiNames: z
              .array(z.string())
              .nullable()
              .describe("Legacy API names that resolve to this dimension.")
              .optional(),
          })
          .nullable()
          .describe("The dimension this compatibility result applies to.")
          .optional(),
        compatibility: z
          .string()
          .nullable()
          .describe("COMPATIBLE or INCOMPATIBLE.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Per-dimension compatibility.")
    .optional(),
  metricCompatibilities: z
    .array(
      z.object({
        metricMetadata: z
          .object({
            apiName: z
              .string()
              .nullable()
              .describe(
                "Metric API name, e.g. activeUsers — drop this from runReport if compatibility is INCOMPATIBLE.",
              )
              .optional(),
            type: z
              .string()
              .nullable()
              .describe(
                "Value type, e.g. TYPE_INTEGER, TYPE_CURRENCY. Cast metric values from runReport using this.",
              )
              .optional(),
            uiName: z
              .string()
              .nullable()
              .describe("Human name shown in the GA4 UI.")
              .optional(),
            description: z
              .string()
              .nullable()
              .describe("What the metric means.")
              .optional(),
            category: z
              .string()
              .nullable()
              .describe("Grouping, e.g. User.")
              .optional(),
            deprecatedApiNames: z
              .array(z.string())
              .nullable()
              .describe("Legacy API names that resolve to this metric.")
              .optional(),
          })
          .nullable()
          .describe("The metric this compatibility result applies to.")
          .optional(),
        compatibility: z
          .string()
          .nullable()
          .describe("COMPATIBLE or INCOMPATIBLE.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Per-metric compatibility.")
    .optional(),
});

const definition = defineTool({
  name: "checkCompatibility",
  title: "Check Compatibility",
  description:
    "Check whether a set of dimensions and metrics can be combined in one runReport before running it. Returns each field's compatibility so you can drop the incompatible ones. Use when runReport returns an incompatible-fields error.",
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
    const url = `https://analyticsdata.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}:checkCompatibility`;
    const body: Record<string, unknown> = {};
    if (input.dimensions !== undefined) body["dimensions"] = input.dimensions;
    if (input.metrics !== undefined) body["metrics"] = input.metrics;
    if (input.compatibilityFilter !== undefined)
      body["compatibilityFilter"] = input.compatibilityFilter;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "checkCompatibility");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
