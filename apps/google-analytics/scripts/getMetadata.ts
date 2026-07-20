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
        "GA4 property id — the bare numeric id (e.g. 123456) or the full properties/123456 name from listAccountSummaries; or 0 for property-agnostic core metadata. Never the G- measurement id.",
      ),
  })
  .strict();
const outputSchema = z.object({
  name: z.string().nullable().describe("Metadata resource name.").optional(),
  dimensions: z
    .array(
      z.object({
        apiName: z
          .string()
          .nullable()
          .describe("Name to use in runReport, e.g. sessionSource.")
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
        customDefinition: z
          .boolean()
          .nullable()
          .describe("True if it is a custom dimension.")
          .optional(),
        deprecatedApiNames: z
          .array(z.string())
          .nullable()
          .describe("Legacy API names that resolve to this dimension.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Available dimensions.")
    .optional(),
  metrics: z
    .array(
      z.object({
        apiName: z
          .string()
          .nullable()
          .describe("Name to use in runReport, e.g. activeUsers.")
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
        type: z
          .string()
          .nullable()
          .describe("Value type, e.g. TYPE_INTEGER, TYPE_CURRENCY.")
          .optional(),
        customDefinition: z
          .boolean()
          .nullable()
          .describe("True if it is a custom metric.")
          .optional(),
        deprecatedApiNames: z
          .array(z.string())
          .nullable()
          .describe("Legacy API names that resolve to this metric.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Available metrics.")
    .optional(),
  comparisons: z
    .array(
      z.object({
        apiName: z
          .string()
          .nullable()
          .describe("Comparison API name.")
          .optional(),
        uiName: z
          .string()
          .nullable()
          .describe("Human name shown in the GA4 UI.")
          .optional(),
        description: z
          .string()
          .nullable()
          .describe("Comparison description.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Available comparisons for the property.")
    .optional(),
});

const definition = defineTool({
  name: "getMetadata",
  title: "Get Metadata",
  description:
    "List the dimensions and metrics available for a property, with API names, UI names, and descriptions. Call before runReport to pick valid dimension/metric names. Pass 0 as propertyId for property-agnostic core metadata.",
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
    const url = `https://analyticsdata.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/metadata`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfGaError(res, "getMetadata");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
