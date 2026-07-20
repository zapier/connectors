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
    parameterName: z
      .string()
      .describe(
        "Event/user parameter to read, e.g. article_id. For USER scope this is a user property name. Letters, digits, and underscores only, starting with a letter; max 24 characters (user-scoped) or 40 (event-scoped).",
      ),
    displayName: z.string().describe("Name shown in reports."),
    scope: z
      .enum(["EVENT", "USER", "ITEM"])
      .describe(
        "EVENT (event parameter), USER (user property), or ITEM (ecommerce item parameter).",
      ),
    description: z
      .string()
      .describe("Optional description of the dimension.")
      .optional(),
    disallowAdsPersonalization: z
      .boolean()
      .describe(
        "USER scope only: exclude this dimension from ads personalization (marks it NPA).",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  name: z
    .string()
    .describe("Resource name, properties/{p}/customDimensions/{id}."),
  parameterName: z
    .string()
    .describe("Event/user parameter this dimension reads, e.g. article_id."),
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
});

const definition = defineTool({
  name: "createCustomDimension",
  title: "Create Custom Dimension",
  description:
    "Create a custom dimension that reports on an event or user parameter. Provide the parameter name, a display name, and a scope (EVENT/USER/ITEM).",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/customDimensions`;
    const body: Record<string, unknown> = {};
    if (input.parameterName !== undefined)
      body["parameterName"] = input.parameterName;
    if (input.displayName !== undefined)
      body["displayName"] = input.displayName;
    if (input.scope !== undefined) body["scope"] = input.scope;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.disallowAdsPersonalization !== undefined)
      body["disallowAdsPersonalization"] = input.disallowAdsPersonalization;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "createCustomDimension");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
