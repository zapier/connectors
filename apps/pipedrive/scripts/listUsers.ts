#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("User id."),
      name: z.string().describe("User name."),
      email: z
        .string()
        .describe("User email — the human-readable disambiguator for owner_id.")
        .nullish(),
      active_flag: z
        .boolean()
        .describe("Whether the user is active.")
        .nullish(),
      is_admin: z.boolean().describe("Whether the user is an admin.").nullish(),
    }),
  ),
});

const definition = defineTool({
  name: "listUsers",
  title: "List Users",
  description:
    "List the account's users. Resolves owner_id for create/update/filter; email is the human-readable disambiguator.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (_input, ctx) => {
    const url = `https://api.pipedrive.com/v1/users`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("listUsers", res);
    return { items: wire.data };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
