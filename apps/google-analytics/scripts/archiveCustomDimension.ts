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
    customDimensionId: z
      .string()
      .describe(
        "Custom dimension id (trailing digits of the resource name). From listCustomDimensions.",
      ),
  })
  .strict();
const outputSchema = z.object({}).describe("Empty object on success.");

const definition = defineTool({
  name: "archiveCustomDimension",
  title: "Archive Custom Dimension",
  description:
    "Archive a custom dimension, freeing its slot. The GA4 Admin API has no delete method for custom dimensions — archive is the only way to remove one.",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customDimensions/${encodeURIComponent(input.customDimensionId)}:archive`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await throwIfGaError(res, "archiveCustomDimension");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
