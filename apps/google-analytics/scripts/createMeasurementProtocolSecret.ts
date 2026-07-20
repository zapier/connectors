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
    dataStreamId: z
      .string()
      .describe(
        "Data stream id to attach the secret to. From listDataStreams.",
      ),
    displayName: z.string().describe("A human-readable name for the secret."),
  })
  .strict();
const outputSchema = z.object({
  name: z
    .string()
    .describe(
      "Resource name, properties/{p}/dataStreams/{s}/measurementProtocolSecrets/{id}.",
    ),
  displayName: z.string().describe("Secret display name."),
  secretValue: z
    .string()
    .describe("The api_secret value to pass to sendEvent for this stream."),
});

const definition = defineTool({
  name: "createMeasurementProtocolSecret",
  title: "Create Measurement Protocol Secret",
  description:
    "Create a Measurement Protocol secret (an api_secret) on a data stream, so events can be sent to that stream via sendEvent. Returns the secret value to use.",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/dataStreams/${encodeURIComponent(input.dataStreamId)}/measurementProtocolSecrets`;
    const body: Record<string, unknown> = {};
    if (input.displayName !== undefined)
      body["displayName"] = input.displayName;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "createMeasurementProtocolSecret");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
