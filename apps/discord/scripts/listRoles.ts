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
  roles: z.array(
    z
      .object({
        id: z
          .string()
          .describe(
            "Role id (a snowflake). Pass to addMemberRole / removeMemberRole.",
          ),
        name: z.string().describe("Role name."),
        color: z
          .number()
          .int()
          .nullable()
          .describe("Role color as a decimal RGB integer; 0 means no color.")
          .optional(),
        hoist: z
          .boolean()
          .nullable()
          .describe(
            "Whether members with this role are shown separately in the member list.",
          )
          .optional(),
        position: z
          .number()
          .int()
          .nullable()
          .describe(
            "Position of the role in the server's hierarchy; higher acts above lower.",
          )
          .optional(),
        permissions: z
          .string()
          .nullable()
          .describe("The role's permission bitfield, as a decimal string.")
          .optional(),
        mentionable: z
          .boolean()
          .nullable()
          .describe("Whether anyone can @mention this role.")
          .optional(),
      })
      .describe("A role in a server."),
  ),
});

const definition = defineTool({
  name: "listRoles",
  title: "List Roles",
  description:
    "List the roles in a server, with their ids, names, colors, and permission bitfields.",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/roles`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listRoles");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { roles: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
