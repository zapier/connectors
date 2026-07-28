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
    user_id: z
      .string()
      .describe(
        "User id (a snowflake). Resolve via listMembers / searchMembers.",
      ),
  })
  .strict();
const outputSchema = z
  .object({
    nick: z
      .string()
      .nullable()
      .describe("The member's server nickname, if set.")
      .optional(),
    roles: z
      .array(z.string())
      .describe("Snowflake ids of the roles assigned to this member."),
    joined_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe("When the user joined the server (ISO 8601).")
      .optional(),
    user: z
      .object({
        id: z.string().describe("Unique user id (a snowflake)."),
        username: z
          .string()
          .describe("The user's username, not unique across the platform."),
        global_name: z
          .string()
          .nullable()
          .describe("The user's display name, if set.")
          .optional(),
        discriminator: z
          .string()
          .nullable()
          .describe(
            'Legacy 4-digit tag; "0" for users migrated to the new username system.',
          )
          .optional(),
        bot: z
          .boolean()
          .nullable()
          .describe("True if this user is a bot.")
          .optional(),
        avatar: z
          .string()
          .nullable()
          .describe("Avatar hash, if the user has a custom avatar.")
          .optional(),
      })
      .describe("A Discord user or bot."),
  })
  .describe("A user's membership in a server, with roles and nickname.");

const definition = defineTool({
  name: "getMember",
  title: "Get Member",
  description:
    "Get a single member of a server by user id, including their roles and nickname.",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/members/${encodeURIComponent(input.user_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord getMember");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
