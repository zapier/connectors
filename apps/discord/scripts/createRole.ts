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
    name: z
      .string()
      .describe('Role name (1–100 characters). Default "new role".'),
    color: z
      .number()
      .int()
      .describe(
        "RGB color as a decimal integer (e.g. 3447003 for blue). Default 0 (no color).",
      )
      .optional(),
    hoist: z
      .boolean()
      .describe(
        "Display members with this role separately in the member list. Default false.",
      )
      .optional(),
    mentionable: z
      .boolean()
      .describe("Allow anyone to @mention this role. Default false.")
      .optional(),
  })
  .strict();
const outputSchema = z
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
  .describe("A role in a server.");

const definition = defineTool({
  name: "createRole",
  title: "Create Role",
  description: "Create a role in a server. Requires Manage Roles permission.",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/roles`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.color !== undefined) body["color"] = input.color;
    if (input.hoist !== undefined) body["hoist"] = input.hoist;
    if (input.mentionable !== undefined)
      body["mentionable"] = input.mentionable;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord createRole");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
