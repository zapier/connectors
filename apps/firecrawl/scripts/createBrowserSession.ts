#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    ttl: z
      .number()
      .int()
      .gte(30)
      .lte(3600)
      .describe("Total session lifetime in seconds (30–3600).")
      .optional(),
    activityTtl: z
      .number()
      .int()
      .gte(10)
      .lte(3600)
      .describe("Seconds of inactivity before the session is destroyed.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .describe(
      "The session id — pass to executeBrowserCode and deleteBrowserSession.",
    ),
  liveViewUrl: z
    .string()
    .nullable()
    .describe("Read-only live view of the session.")
    .optional(),
  interactiveLiveViewUrl: z
    .string()
    .nullable()
    .describe("Controllable live view of the session.")
    .optional(),
  expiresAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createBrowserSession",
  title: "Create Browser Session",
  description:
    "Create a live browser session you drive with executeBrowserCode, then close with deleteBrowserSession. Billed per minute until stopped. To drive a page you scraped, use interactWithScrape instead.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/interact`;
    const body: Record<string, unknown> = {};
    if (input.ttl !== undefined) body["ttl"] = input.ttl;
    if (input.activityTtl !== undefined)
      body["activityTtl"] = input.activityTtl;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl createBrowserSession");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
