#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({ id: z.number().int().describe("User id. From listUsers.") })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("User id."),
  name: z.string().describe("User name."),
  email: z
    .string()
    .describe("User email — the human-readable disambiguator for owner_id.")
    .nullish(),
  active_flag: z.boolean().describe("Whether the user is active.").nullish(),
  is_admin: z.boolean().describe("Whether the user is an admin.").nullish(),
});

const definition = defineTool({
  name: "getUser",
  title: "Get User",
  description: "Fetch one user by id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/v1/users/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("getUser", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
