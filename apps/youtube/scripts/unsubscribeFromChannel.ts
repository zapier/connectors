#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SuccessResultSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The subscription id to delete (from listSubscriptions, not the channel id).",
      ),
  })
  .strict();
const outputSchema = SuccessResultSchema;

const definition = defineTool({
  name: "unsubscribeFromChannel",
  title: "Unsubscribe From Channel",
  description:
    "Unsubscribe the authenticated user from a channel. The id is the subscription id from listSubscriptions (NOT the channel id).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    // Reversible — the user can re-subscribe with subscribeToChannel.
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/subscriptions`);
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwForYouTube(res, "unsubscribeFromChannel");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
