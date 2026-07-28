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
      .describe("Channel id (a snowflake) to attach the webhook to."),
    name: z
      .string()
      .describe(
        "Default name shown on messages this webhook posts (1–80 characters).",
      ),
  })
  .strict();
const outputSchema = z
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
  .describe("A channel webhook that can post messages as a custom identity.");

const definition = defineTool({
  name: "createWebhook",
  title: "Create Webhook",
  description:
    "Create a webhook on a channel. Returns its id and token, which executeWebhook uses to post as a custom identity. Requires Manage Webhooks permission.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/webhooks`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord createWebhook");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
