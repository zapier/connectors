#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, readDropbox } from "../lib/dropbox.ts";

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  account_id: z.string().describe("Stable account identifier."),
  email: z.string(),
  name: z.string().describe("The account holder's display name."),
  country: z.string().describe("Two-letter country code, if set.").optional(),
  account_type: z.string().describe("One of basic, pro, business.").optional(),
  is_team: z
    .boolean()
    .describe("True if the account belongs to a Dropbox Business team.")
    .optional(),
  team_name: z.string().describe("Team name (team accounts only).").optional(),
  root_namespace_id: z
    .string()
    .describe(
      "Namespace id of the account's root (team space root for team members).",
    )
    .optional(),
  home_namespace_id: z
    .string()
    .describe("Namespace id of the user's personal home space.")
    .optional(),
  home_path: z
    .string()
    .describe(
      "Path of the user's home folder within the team space, if applicable.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getCurrentAccount",
  title: "Get Current Account",
  description:
    'Get the authenticated account\'s identity and root namespace info. The primary "who am I / which Dropbox am I in" resolver; also surfaces the team and personal namespace ids for team-space targeting.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (_input, ctx) => {
    // This endpoint requires a literal null JSON body.
    const res = await ctx.fetch(`${API_BASE}/2/users/get_current_account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    // The wire returns a FullAccount; flatten the nested name/account_type/team/
    // root_info shapes (all outside the JQ transform subset) into the agent surface.
    const data = await readDropbox<{
      account_id: string;
      email: string;
      name?: { display_name?: string };
      country?: string;
      account_type?: { ".tag"?: string };
      team?: { name?: string } | null;
      root_info?: {
        root_namespace_id?: string;
        home_namespace_id?: string;
        home_path?: string;
      };
    }>("getCurrentAccount", res);
    return {
      account_id: data.account_id,
      email: data.email,
      name: data.name?.display_name,
      country: data.country,
      account_type: data.account_type?.[".tag"],
      is_team: data.team != null,
      team_name: data.team?.name,
      root_namespace_id: data.root_info?.root_namespace_id,
      home_namespace_id: data.root_info?.home_namespace_id,
      home_path: data.root_info?.home_path,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
