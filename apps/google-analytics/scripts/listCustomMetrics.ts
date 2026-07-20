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
    pageToken: z
      .string()
      .describe("Cursor from a prior response's nextPageToken.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  customMetrics: z
    .array(
      z.object({
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
        scope: z
          .string()
          .describe("EVENT (the only supported scope for custom metrics)."),
        description: z
          .string()
          .nullable()
          .describe("Optional description.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Custom metrics under the property.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listCustomMetrics",
  title: "List Custom Metrics",
  description:
    "List a property's custom metrics (parameter name, display name, measurement unit). Use to see configured custom metrics or find one before archiving.",
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
    const url = new URL(
      `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customMetrics`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listCustomMetrics");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
