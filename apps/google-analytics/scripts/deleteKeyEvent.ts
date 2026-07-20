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
      .describe("Key event id to delete. From listKeyEvents."),
  })
  .strict();
const outputSchema = z.object({}).describe("Empty object on success.");

const definition = defineTool({
  name: "deleteKeyEvent",
  title: "Delete Key Event",
  description:
    "Delete a key event by id, so the event is no longer tracked as a key event. Only key events with deletable=true can be removed.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-analytics",
  run: async (input, ctx) => {
    const url = `https://analyticsadmin.googleapis.com/v1beta/${toPropertyPath(input.propertyId)}/keyEvents/${encodeURIComponent(input.keyEventId)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfGaError(res, "deleteKeyEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
