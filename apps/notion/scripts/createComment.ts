#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    parent: z
      .object({ page_id: z.string().optional() })
      .strict()
      .describe(
        'Start a new comment thread on a page. Shape { "page_id": "<uuid>" }. Provide either `parent` or `discussion_id`, not both.',
      )
      .optional(),
    discussion_id: z
      .string()
      .describe(
        "Reply to an existing comment thread by its discussion id (from listComments). Provide either `parent` or `discussion_id`, not both.",
      )
      .optional(),
    rich_text: z
      .array(z.record(z.string(), z.json()))
      .describe(
        'The comment body as a rich-text array, e.g. [{ "text": { "content": "Looks good!" } }].',
      ),
  })
  .strict()
  .refine(
    (input) =>
      [input.parent, input.discussion_id].filter((v) => v !== undefined)
        .length === 1,
    {
      message:
        "Provide exactly one of `parent` (start a thread on a page) or `discussion_id` (reply to a thread).",
      path: ["parent"],
    },
  )
  .meta({
    oneOf: [{ required: ["parent"] }, { required: ["discussion_id"] }],
  });
const outputSchema = z
  .object({
    object: z.literal("comment"),
    id: z.string().describe("The comment id."),
    parent: z
      .object({
        type: z
          .enum([
            "data_source_id",
            "page_id",
            "database_id",
            "block_id",
            "workspace",
          ])
          .describe("The kind of container this object belongs to.")
          .optional(),
        data_source_id: z.string().optional(),
        page_id: z.string().optional(),
        database_id: z.string().optional(),
        block_id: z.string().optional(),
      })
      .describe("The container this object belongs to.")
      .optional(),
    discussion_id: z
      .string()
      .describe("The thread id; pass to createComment to reply."),
    created_time: z.string().datetime({ offset: true }).optional(),
    created_by: z
      .object({ id: z.string().optional(), object: z.string().optional() })
      .optional(),
    rich_text: z
      .array(z.record(z.string(), z.json()))
      .describe("The comment body as rich-text objects.")
      .optional(),
  })
  .describe("A comment on a page or block.");

const definition = defineTool({
  name: "createComment",
  title: "Create Comment",
  description:
    "Add a comment to a page or reply to an existing comment thread. Provide exactly one of parent (a page id, to start a thread) or discussion_id (to reply to an existing thread).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/comments`;
    const body: Record<string, unknown> = {};
    if (input.parent !== undefined) body["parent"] = input.parent;
    if (input.discussion_id !== undefined)
      body["discussion_id"] = input.discussion_id;
    if (input.rich_text !== undefined) body["rich_text"] = input.rich_text;
    const res = await notionFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
