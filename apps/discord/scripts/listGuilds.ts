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
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max servers to return (1–200). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    after: z
      .string()
      .describe(
        "Return servers with an id greater than this snowflake — set to the last id of the previous page to page forward.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  guilds: z.array(
    z
      .object({
        id: z
          .string()
          .describe(
            "Server (guild) id (a snowflake). Pass this as guild_id to server-scoped tools.",
          ),
        name: z.string().describe("Server name."),
        owner: z
          .boolean()
          .nullable()
          .describe("True if the bot's token owner owns this server.")
          .optional(),
        permissions: z
          .string()
          .nullable()
          .describe(
            "The bot's permission bitfield in this server, as a decimal string.",
          )
          .optional(),
      })
      .describe("A server the bot belongs to, as returned by listGuilds."),
  ),
});

const definition = defineTool({
  name: "listGuilds",
  title: "List Guilds",
  description:
    "List the servers (guilds) the bot belongs to — the entry point for discovering guild_id values other tools need.",
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
    const url = new URL(`https://discord.com/api/v10/users/@me/guilds`);
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listGuilds");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { guilds: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
