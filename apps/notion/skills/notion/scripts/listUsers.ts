#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Results per page (max 100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    start_cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  results: z.array(
    z
      .object({
        object: z.literal("user"),
        id: z.string().describe("The user id."),
        type: z
          .enum(["person", "bot"])
          .describe('"person" or "bot".')
          .optional(),
        name: z.string().describe("The user's display name.").optional(),
        avatar_url: z.union([z.string(), z.null()]).optional(),
        person: z
          .record(z.string(), z.json())
          .describe('Present when type is person; e.g. { "email": "…" }.')
          .optional(),
        bot: z
          .record(z.string(), z.json())
          .describe("Present when type is bot; bot metadata.")
          .optional(),
      })
      .describe("A Notion user (a person or a bot)."),
  ),
  next_cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean(),
});

const definition = defineTool({
  name: "listUsers",
  title: "List Users",
  description:
    "List all users (members and bots) in the workspace. Use to resolve a person's name to a user id for people-type properties or mentions.",
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
    const url = new URL(`https://api.notion.com/v1/users`);
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.start_cursor !== undefined) {
      url.searchParams.set("start_cursor", String(input.start_cursor));
    }
    const res = await notionFetch(ctx.fetch, url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
