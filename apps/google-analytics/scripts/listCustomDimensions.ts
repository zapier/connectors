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
  customDimensions: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Resource name, properties/{p}/customDimensions/{id}."),
        parameterName: z
          .string()
          .describe(
            "Event/user parameter this dimension reads, e.g. article_id.",
          ),
        displayName: z.string().describe("Name shown in reports."),
        scope: z.string().describe("EVENT, USER, or ITEM."),
        description: z
          .string()
          .nullable()
          .describe("Optional description.")
          .optional(),
        disallowAdsPersonalization: z
          .boolean()
          .nullable()
          .describe("USER-scope only: exclude from ads personalization.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Custom dimensions under the property.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listCustomDimensions",
  title: "List Custom Dimensions",
  description:
    "List a property's custom dimensions (parameter name, display name, scope). Use to see configured custom dimensions or find one before archiving.",
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
      `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customDimensions`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listCustomDimensions");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
