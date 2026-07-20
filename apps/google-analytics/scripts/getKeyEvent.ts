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
    keyEventId: z
      .string()
      .describe(
        "Key event id (trailing digits of the resource name). From listKeyEvents.",
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
  name: "getKeyEvent",
  title: "Get Key Event",
  description:
    "Get one key event by id, including its event name, counting method, and whether it is deletable.",
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
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/keyEvents/${encodeURIComponent(input.keyEventId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfGaError(res, "getKeyEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
