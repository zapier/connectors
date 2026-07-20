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
  dataStreams: z
    .array(
      z.object({
        name: z
          .string()
          .nullable()
          .describe(
            "Stream resource name, properties/{p}/dataStreams/{streamId}.",
          )
          .optional(),
        displayName: z
          .string()
          .nullable()
          .describe("Stream display name.")
          .optional(),
        type: z
          .string()
          .nullable()
          .describe(
            "WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, or IOS_APP_DATA_STREAM.",
          )
          .optional(),
        webStreamData: z
          .object({
            measurementId: z
              .string()
              .nullable()
              .describe(
                "Web-stream measurement id, G-XXXXXXX — the measurementId sendEvent needs.",
              )
              .optional(),
            defaultUri: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
        createTime: z
          .string()
          .nullable()
          .describe("Stream creation time, RFC 3339.")
          .optional(),
        updateTime: z
          .string()
          .nullable()
          .describe("Stream last-modified time, RFC 3339.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Data streams under the property.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listDataStreams",
  title: "List Data Streams",
  description:
    "List a property's data streams (web/iOS/Android). Web streams carry the G- measurement id that sendEvent and createMeasurementProtocolSecret need.",
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
      `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/dataStreams`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listDataStreams");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
