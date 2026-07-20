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
  })
  .strict();
const outputSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("Property resource name, properties/{propertyId}.")
    .optional(),
  displayName: z
    .string()
    .nullable()
    .describe("Property display name.")
    .optional(),
  currencyCode: z
    .string()
    .nullable()
    .describe("Reporting currency, ISO 4217.")
    .optional(),
  timeZone: z
    .string()
    .nullable()
    .describe(
      "Reporting timezone, e.g. America/Los_Angeles — the zone relative report dates resolve in.",
    )
    .optional(),
  industryCategory: z
    .string()
    .nullable()
    .describe("Industry category, e.g. TECHNOLOGY.")
    .optional(),
  createTime: z
    .string()
    .nullable()
    .describe("Property creation time, RFC 3339.")
    .optional(),
  updateTime: z
    .string()
    .nullable()
    .describe("Property last-modified time, RFC 3339.")
    .optional(),
  parent: z
    .string()
    .nullable()
    .describe("Parent resource name, accounts/{accountId}.")
    .optional(),
  account: z
    .string()
    .nullable()
    .describe("Immutable account resource name, accounts/{accountId}.")
    .optional(),
  serviceLevel: z
    .string()
    .nullable()
    .describe("Google Analytics service level, e.g. GOOGLE_ANALYTICS_STANDARD.")
    .optional(),
  propertyType: z
    .string()
    .nullable()
    .describe(
      "Property type, e.g. PROPERTY_TYPE_ORDINARY, PROPERTY_TYPE_SUBPROPERTY.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getProperty",
  title: "Get Property",
  description:
    "Get a GA4 property's configuration: display name, reporting currency, timezone, and industry category. Read the timezone/currency to interpret report values (report dates resolve in the property timezone).",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfGaError(res, "getProperty");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
