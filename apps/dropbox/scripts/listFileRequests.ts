#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, fileRequestSchema, readDropbox } from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1)
      .default(20)
      .describe(
        "Max file requests per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      ),
    cursor: z
      .string()
      .describe(
        "Pass the cursor from a previous listFileRequests response to fetch the next page. When set, limit is ignored.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  file_requests: z.array(fileRequestSchema),
  cursor: z
    .string()
    .describe("Pass to listFileRequests to fetch the next page.")
    .optional(),
  has_more: z
    .boolean()
    .describe("True if more file requests are available via cursor.")
    .optional(),
});

const definition = defineTool({
  name: "listFileRequests",
  title: "List File Requests",
  description:
    "List the file requests owned by the current account. Use to find a file request's id, URL, or upload count.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    // Continuation pages hit a sibling /continue endpoint with a cursor-only body.
    const url = input.cursor
      ? `${API_BASE}/2/file_requests/list/continue`
      : `${API_BASE}/2/file_requests/list_v2`;
    const body = input.cursor
      ? { cursor: input.cursor }
      : { limit: input.limit };
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // FileRequests are plain objects (no .tag) — pass them straight through.
    const data = await readDropbox<{
      file_requests?: unknown[];
      cursor?: string;
      has_more?: boolean;
    }>("listFileRequests", res);
    return {
      file_requests: data.file_requests ?? [],
      cursor: data.cursor,
      has_more: data.has_more,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
