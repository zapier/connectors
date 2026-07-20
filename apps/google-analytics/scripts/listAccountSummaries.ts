#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwIfGaError } from "../lib/googleAnalytics.ts";

const inputSchema = z
  .object({
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's nextPageToken; omit for the first page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  accountSummaries: z
    .array(
      z.object({
        account: z
          .string()
          .nullable()
          .describe("Account resource name, accounts/{accountId}.")
          .optional(),
        name: z
          .string()
          .nullable()
          .describe("Account resource name (same as account field).")
          .optional(),
        displayName: z
          .string()
          .nullable()
          .describe("Account display name.")
          .optional(),
        propertySummaries: z
          .array(
            z.object({
              property: z
                .string()
                .nullable()
                .describe(
                  "Property resource name, properties/{propertyId}. The trailing digits are the propertyId every other tool takes.",
                )
                .optional(),
              displayName: z
                .string()
                .nullable()
                .describe("Property display name.")
                .optional(),
              propertyType: z
                .string()
                .nullable()
                .describe(
                  "e.g. PROPERTY_TYPE_ORDINARY, PROPERTY_TYPE_SUBPROPERTY.",
                )
                .optional(),
              parent: z
                .string()
                .nullable()
                .describe("Parent account resource name, accounts/{accountId}.")
                .optional(),
              canEdit: z
                .boolean()
                .nullable()
                .describe(
                  "True if the user has edit permission on this property.",
                )
                .optional(),
            }),
          )
          .nullable()
          .describe("Properties under this account.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Accessible accounts with their properties.")
    .optional(),
  nextPageToken: z
    .string()
    .nullable()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listAccountSummaries",
  title: "List Account Summaries",
  description:
    "List all GA4 accounts the user can access, each with its properties (id + display name) in one call. The entry point for resolving which propertyId to operate on.",
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
      `https://analyticsadmin.googleapis.com/v1beta/accountSummaries`,
    );
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfGaError(res, "listAccountSummaries");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
