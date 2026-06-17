#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z
  .object({
    object: z.literal("user"),
    id: z.string().describe("The user id."),
    type: z.enum(["person", "bot"]).describe('"person" or "bot".').optional(),
    name: z.string().describe("The user's display name.").optional(),
    avatar_url: z.union([z.string(), z.null()]).optional(),
    person: z
      .object({ email: z.string().optional() })
      .describe(
        "Present for person users; carries email when the integration has the capability.",
      )
      .optional(),
    bot: z
      .record(z.string(), z.json())
      .describe("Present for bot users; carries the owner and workspace info.")
      .optional(),
  })
  .describe("A Notion user (a person or a bot).");

const definition = defineTool({
  name: "getBotUser",
  title: "Get Bot User",
  description:
    "Retrieve the bot user associated with the current token, including the integration's name and the workspace it is connected to. Use to confirm identity and which workspace the connection targets.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (_input, ctx) => {
    const url = `https://api.notion.com/v1/users/me`;
    const res = await notionFetch(ctx.fetch, url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
