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
    query: z
      .string()
      .describe("Username or nickname prefix to match (case-insensitive)."),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max members to return (1–1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  members: z.array(
    z
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
      .describe("A user's membership in a server, with roles and nickname."),
  ),
});

const definition = defineTool({
  name: "searchMembers",
  title: "Search Members",
  description:
    "Search a server's members by username or nickname prefix. Returns members whose name starts with the query.",
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
    const url = new URL(
      `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/members/search`,
    );
    if (input.query !== undefined) {
      url.searchParams.set("query", String(input.query));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord searchMembers");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { members: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
