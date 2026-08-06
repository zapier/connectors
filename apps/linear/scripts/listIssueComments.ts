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
        'The issue UUID or its human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max comments to return. Defaults to 25 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  comments: z.array(
    z.object({
      id: z.uuid(),
      url: z.string(),
      body: z.string().describe("Comment body in Markdown."),
      createdAt: z.string().optional(),
      user: z.object({ id: z.uuid(), name: z.string() }).nullable().optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more comments are available."),
});

const ISSUE_COMMENTS = `
query IssueComments($id: String!, $first: Int, $after: String) {
  issue(id: $id) {
    comments(first: $first, after: $after) {
      nodes { id url body createdAt user { id name } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const definition = defineTool({
  name: "listIssueComments",
  title: "List Issue Comments",
  description:
    "List the comments on a Linear issue. Returns a page of comments plus a cursor. Pairs with createComment.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const data = await linearGraphql<{
      issue: {
        comments: {
          nodes: z.infer<typeof outputSchema>["comments"];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(ctx.fetch, ISSUE_COMMENTS, {
      id: input.issueId,
      first: input.limit ?? 25,
      after: input.cursor,
    });

    return {
      comments: data.issue.comments.nodes,
      nextCursor: data.issue.comments.pageInfo.hasNextPage
        ? data.issue.comments.pageInfo.endCursor
        : null,
      hasMore: data.issue.comments.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
