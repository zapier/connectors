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
  keyEvents: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            "Key event resource name, properties/{p}/keyEvents/{keyEventId}.",
          ),
        eventName: z
          .string()
          .describe(
            "The event that counts as a key event, e.g. purchase, sign_up.",
          ),
        countingMethod: z
          .string()
          .nullable()
          .describe("ONCE_PER_EVENT or ONCE_PER_SESSION.")
          .optional(),
        custom: z
          .boolean()
          .nullable()
          .describe("True if user-defined (vs a default key event).")
          .optional(),
        deletable: z
          .boolean()
          .nullable()
          .describe("True if this key event can be deleted.")
          .optional(),
        createTime: z
          .string()
          .nullable()
          .describe("Creation time, RFC 3339.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Key events under the property.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listKeyEvents",
  title: "List Key Events",
  description:
    "List a property's key events (the important business actions GA4 tracks, e.g. purchase, sign_up). Use to discover a keyEventId before getKeyEvent/deleteKeyEvent, or to check whether an event is already a key event.",
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
      `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/keyEvents`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listKeyEvents");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
