#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    history_item_id: z.string().describe("History item ID from listHistory."),
  })
  .strict();
const outputSchema = z.object({
  status: z.string().describe('"ok" on success.'),
});

const definition = defineTool({
  name: "deleteHistoryItem",
  title: "Delete History Item",
  description:
    "Permanently delete one history item by history_item_id. Irreversible; its audio can no longer be re-downloaded.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/history/${encodeURIComponent(input.history_item_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs deleteHistoryItem");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
