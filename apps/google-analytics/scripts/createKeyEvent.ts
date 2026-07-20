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
    eventName: z
      .string()
      .describe(
        "The event to count as a key event, e.g. purchase. Any valid GA4 event name is accepted; it does not need to have been collected yet.",
      ),
    countingMethod: z
      .enum(["ONCE_PER_EVENT", "ONCE_PER_SESSION"])
      .describe(
        "How to count: once per event occurrence, or at most once per session.",
      ),
  })
  .strict();
const outputSchema = z.object({
  name: z
    .string()
    .describe(
      "Key event resource name, properties/{p}/keyEvents/{keyEventId}.",
    ),
  eventName: z
    .string()
    .describe("The event that counts as a key event, e.g. purchase, sign_up."),
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
});

const definition = defineTool({
  name: "createKeyEvent",
  title: "Create Key Event",
  description:
    "Mark an event name as a key event (an action important to the business) for a property. Provide the event name and a counting method. Check listKeyEvents first to avoid a duplicate.",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/keyEvents`;
    const body: Record<string, unknown> = {};
    if (input.eventName !== undefined) body["eventName"] = input.eventName;
    if (input.countingMethod !== undefined)
      body["countingMethod"] = input.countingMethod;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfGaError(res, "createKeyEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
