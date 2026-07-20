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
    parameterName: z
      .string()
      .describe(
        "Numeric event parameter to read, e.g. score. Letters, digits, and underscores only, starting with a letter; max 40 characters.",
      ),
    displayName: z.string().describe("Name shown in reports."),
    measurementUnit: z
      .enum([
        "STANDARD",
        "CURRENCY",
        "FEET",
        "METERS",
        "KILOMETERS",
        "MILES",
        "MILLISECONDS",
        "SECONDS",
        "MINUTES",
        "HOURS",
      ])
      .describe(
        "Unit of the metric value. When set to CURRENCY, restrictedMetricType is required.",
      ),
    restrictedMetricType: z
      .array(z.enum(["COST_DATA", "REVENUE_DATA"]))
      .describe(
        "Types of restricted data this metric may contain. Required (non-empty) when measurementUnit is CURRENCY; omit for any other unit.",
      )
      .optional(),
    scope: z
      .literal("EVENT")
      .describe("Custom metrics support EVENT scope only."),
    description: z
      .string()
      .describe("Optional description of the metric.")
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const isCurrency = val.measurementUnit === "CURRENCY";
    const hasRestricted =
      val.restrictedMetricType !== undefined &&
      val.restrictedMetricType.length > 0;
    if (isCurrency && !hasRestricted) {
      ctx.addIssue({
        code: "custom",
        path: ["restrictedMetricType"],
        message:
          "restrictedMetricType is required when measurementUnit is CURRENCY (COST_DATA and/or REVENUE_DATA).",
      });
    }
    if (!isCurrency && hasRestricted) {
      ctx.addIssue({
        code: "custom",
        path: ["restrictedMetricType"],
        message:
          "restrictedMetricType is only allowed when measurementUnit is CURRENCY.",
      });
    }
  });
const outputSchema = z.object({
  name: z
    .string()
    .describe("Resource name, properties/{p}/customMetrics/{id}."),
  parameterName: z
    .string()
    .describe("Event parameter this metric reads, e.g. score."),
  displayName: z.string().describe("Name shown in reports."),
  measurementUnit: z
    .string()
    .describe(
      "STANDARD, CURRENCY, FEET, METERS, KILOMETERS, MILES, MILLISECONDS, SECONDS, MINUTES, or HOURS.",
    ),
  restrictedMetricType: z
    .array(z.string())
    .nullable()
    .describe(
      "Restricted data types (COST_DATA / REVENUE_DATA); present for CURRENCY metrics.",
    )
    .optional(),
  scope: z
    .string()
    .describe("EVENT (the only supported scope for custom metrics)."),
  description: z
    .string()
    .nullable()
    .describe("Optional description.")
    .optional(),
});

const definition = defineTool({
  name: "createCustomMetric",
  title: "Create Custom Metric",
  description:
    "Create a custom metric that reports on a numeric event parameter. Provide the parameter name, a display name, and a measurement unit.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-analytics",
  run: async (input, ctx) => {
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customMetrics`;
    const body: Record<string, unknown> = {};
    if (input.parameterName !== undefined)
      body["parameterName"] = input.parameterName;
    if (input.displayName !== undefined)
      body["displayName"] = input.displayName;
    if (input.measurementUnit !== undefined)
      body["measurementUnit"] = input.measurementUnit;
    if (input.restrictedMetricType !== undefined)
      body["restrictedMetricType"] = input.restrictedMetricType;
    if (input.scope !== undefined) body["scope"] = input.scope;
    if (input.description !== undefined)
      body["description"] = input.description;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "createCustomMetric");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
