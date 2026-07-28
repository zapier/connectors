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
    role_id: z
      .string()
      .describe("Role id (a snowflake). Resolve via listRoles."),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "addMemberRole",
  title: "Add Member Role",
  description:
    "Add a role to a server member. Requires Manage Roles permission and the bot's highest role above the target role.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/members/${encodeURIComponent(input.user_id)}/roles/${encodeURIComponent(input.role_id)}`;
    const res = await ctx.fetch(url, {
      method: "PUT",
    });
    await throwIfNotOk(res, "Discord addMemberRole");
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
