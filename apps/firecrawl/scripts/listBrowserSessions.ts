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
    status: z
      .enum(["active", "destroyed"])
      .describe("Filter by session status.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["active", "destroyed"]).nullable().optional(),
      createdAt: z.string().nullable().optional(),
      lastActivity: z.string().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listBrowserSessions",
  title: "List Browser Sessions",
  description:
    "List your browser sessions, optionally filtered by status. Recovers a session id to resume or clean up.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = new URL(`https://api.firecrawl.dev/v2/interact`);
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl listBrowserSessions");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
