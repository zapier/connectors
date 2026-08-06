#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe("Match against a user's name or email (case-insensitive).")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max users to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  users: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.string().optional(),
      displayName: z.string().optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more users are available."),
});

const LIST_USERS = `
query Users($filter: UserFilter, $first: Int, $after: String) {
  users(filter: $filter, first: $first, after: $after) {
    nodes { id name email displayName }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listUsers",
  title: "List Users",
  description:
    "List workspace users. Resolve a name or email to a user id for assigneeId. Use getViewer for your own id. Returns a page plus a cursor.",
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
      users: {
        nodes: z.infer<typeof outputSchema>["users"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_USERS, {
      filter:
        input.query !== undefined
          ? {
              or: [
                { name: { containsIgnoreCase: input.query } },
                { email: { containsIgnoreCase: input.query } },
              ],
            }
          : undefined,
      first: input.limit ?? 50,
      after: input.cursor,
    });

    return {
      users: data.users.nodes,
      nextCursor: data.users.pageInfo.hasNextPage
        ? data.users.pageInfo.endCursor
        : null,
      hasMore: data.users.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
