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
const outputSchema = z
  .object({
    id: z.string().describe("Server (guild) id (a snowflake)."),
    name: z.string().describe("Server name."),
    owner_id: z
      .string()
      .nullable()
      .describe("User id of the server owner (a snowflake).")
      .optional(),
    description: z
      .string()
      .nullable()
      .describe("Server description, if set.")
      .optional(),
    approximate_member_count: z
      .number()
      .int()
      .nullable()
      .describe("Approximate number of members, when available.")
      .optional(),
  })
  .describe("Full information about a server (guild).");

const definition = defineTool({
  name: "getGuild",
  title: "Get Guild",
  description:
    "Get information about a server (guild) by id — name, owner, and metadata.",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord getGuild");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
