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
    sessionId: z.string().describe("The session id from createBrowserSession."),
  })
  .strict();
const outputSchema = z.object({
  sessionDurationMs: z.number().int().nullable().optional(),
  creditsBilled: z.number().nullable().optional(),
});

const definition = defineTool({
  name: "deleteBrowserSession",
  title: "Delete Browser Session",
  description:
    "Close a browser session and stop its per-minute billing. Always call this when done — sessions bill until stopped or they expire.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/interact/${encodeURIComponent(input.sessionId)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Firecrawl deleteBrowserSession");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
