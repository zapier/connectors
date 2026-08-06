#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    issueId: z
      .string()
      .describe(
        'The issue to comment on, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    body: z
      .string()
      .describe(
        "The comment body, in Markdown. Supports Linear's markdown surface.",
      ),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The comment's UUID."),
  url: z.string().describe("The comment's URL in Linear."),
});

const CREATE_COMMENT = `
mutation CommentCreate($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment { id url }
  }
}`;

const definition = defineTool({
  name: "createComment",
  title: "Create Comment",
  description: "Post a Markdown comment on a Linear issue.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const data = await linearGraphql<{
      commentCreate: { comment: z.infer<typeof outputSchema> };
    }>(ctx.fetch, CREATE_COMMENT, {
      input: { issueId: input.issueId, body: input.body },
    });
    return data.commentCreate.comment;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
