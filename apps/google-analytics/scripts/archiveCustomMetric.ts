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
    customMetricId: z
      .string()
      .describe(
        "Custom metric id (trailing digits of the resource name). From listCustomMetrics.",
      ),
  })
  .strict();
const outputSchema = z.object({}).describe("Empty object on success.");

const definition = defineTool({
  name: "archiveCustomMetric",
  title: "Archive Custom Metric",
  description:
    "Archive a custom metric, freeing its slot. The GA4 Admin API has no delete method for custom metrics — archive is the only way to remove one.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-analytics",
  run: async (input, ctx) => {
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customMetrics/${encodeURIComponent(input.customMetricId)}:archive`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await throwIfGaError(res, "archiveCustomMetric");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
