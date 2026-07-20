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
        "Data stream id (trailing digits of the stream resource name). From listDataStreams.",
      ),
    pageToken: z
      .string()
      .describe("Cursor from a prior response's nextPageToken.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  measurementProtocolSecrets: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            "Resource name, properties/{p}/dataStreams/{s}/measurementProtocolSecrets/{id}.",
          ),
        displayName: z.string().describe("Secret display name."),
        secretValue: z
          .string()
          .describe(
            "The api_secret value to pass to sendEvent for this stream.",
          ),
      }),
    )
    .nullable()
    .describe("Secrets under the data stream.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listMeasurementProtocolSecrets",
  title: "List Measurement Protocol Secrets",
  description:
    "List a data stream's Measurement Protocol secrets, including their secret values. Use to obtain the api_secret that sendEvent needs, or before creating a new one.",
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
      `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/dataStreams/${encodeURIComponent(input.dataStreamId)}/measurementProtocolSecrets`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listMeasurementProtocolSecrets");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
