#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Activity type id."),
      name: z.string().describe("Display name."),
      key_string: z
        .string()
        .describe(
          "The type key — the value createActivity.type takes (not the display name).",
        ),
      icon_key: z.string().describe("Icon key.").nullish(),
    }),
  ),
});

const definition = defineTool({
  name: "listActivityTypes",
  title: "List Activity Types",
  description:
    "List the account's activity types. The key_string is the value createActivity.type takes (not the display name).",
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
    const url = `https://api.pipedrive.com/v1/activityTypes`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("listActivityTypes", res);
    return { items: wire.data };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
