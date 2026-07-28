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
    channel_id: z
      .string()
      .describe("Channel id (a snowflake). Resolve via listChannels."),
  })
  .strict();
const outputSchema = z.object({
  webhooks: z.array(
    z
      .object({
        id: z
          .string()
          .describe("Webhook id (a snowflake). Pass to executeWebhook."),
        token: z
          .string()
          .nullable()
          .describe(
            "Webhook token — the secret that, with the id, authorizes executeWebhook. Treat as a credential.",
          )
          .optional(),
        name: z.string().describe("The webhook's default display name."),
        channel_id: z
          .string()
          .nullable()
          .describe("Channel the webhook posts to (a snowflake).")
          .optional(),
        guild_id: z
          .string()
          .nullable()
          .describe("Server the webhook belongs to (a snowflake).")
          .optional(),
      })
      .describe(
        "A channel webhook that can post messages as a custom identity.",
      ),
  ),
});

const definition = defineTool({
  name: "listChannelWebhooks",
  title: "List Channel Webhooks",
  description:
    "List the webhooks configured on a channel, with the id and token executeWebhook needs.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/webhooks`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listChannelWebhooks");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { webhooks: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
