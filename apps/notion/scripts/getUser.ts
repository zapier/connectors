#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    user_id: z.string().describe("The user id (UUID, with or without dashes)."),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('Always "user".'),
    id: z.string().describe("The user id (UUID)."),
    type: z.string().describe('"person" or "bot".').optional(),
    name: z.string().describe("The user's display name.").optional(),
    avatar_url: z.union([z.string(), z.null()]).optional(),
    person: z
      .object({ email: z.string().optional() })
      .describe(
        "Present for person users; carries email when the integration has the capability.",
      )
      .optional(),
    bot: z
      .record(z.string(), z.any())
      .describe("Present for bot users; carries the owner and workspace info.")
      .optional(),
  })
  .describe("A Notion user (a person or a bot).");

const definition = defineTool({
  name: "getUser",
  title: "Get User",
  description:
    "Retrieve a single user (person or bot) by id, including name, avatar, and (for people, with the right capability) email.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/users/${encodeURIComponent(normalizeNotionId(input.user_id))}`;
    const res = await notionFetch(ctx.fetch, "getUser", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
