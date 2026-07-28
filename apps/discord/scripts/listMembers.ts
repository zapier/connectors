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
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max members to return (1–1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    after: z
      .string()
      .describe(
        "Return members with a user id greater than this snowflake — set to the last user id of the previous page to page forward.",
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
  name: "listMembers",
  title: "List Members",
  description:
    "List members of a server, paginated. Page with the after cursor set to the last user id from the previous page.",
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
      `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/members`,
    );
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listMembers");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { members: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
