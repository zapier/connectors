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
    guild_id: z
      .string()
      .describe("Server (guild) id (a snowflake). Resolve via listGuilds."),
  })
  .strict();
const outputSchema = z.object({
  emojis: z.array(
    z
      .object({
        id: z
          .string()
          .describe(
            "Emoji id (a snowflake). Combine with name as name:id for addReaction, or <:name:id> in message content.",
          ),
        name: z.string().describe("Emoji name (without colons)."),
        animated: z
          .boolean()
          .nullable()
          .describe(
            "True if the emoji is animated (use <a:name:id> in content).",
          )
          .optional(),
      })
      .describe("A custom emoji defined in a server."),
  ),
});

const definition = defineTool({
  name: "listEmojis",
  title: "List Emojis",
  description:
    "List a server's custom emojis, with the name:id form used by addReaction and in message content (<:name:id>).",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/emojis`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listEmojis");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { emojis: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
