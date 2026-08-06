#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max teams to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  teams: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      key: z.string().describe('Team key, e.g. "ENG".'),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more teams are available."),
});

const LIST_TEAMS = `
query Teams($first: Int, $after: String) {
  teams(first: $first, after: $after) {
    nodes { id name key }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listTeams",
  title: "List Teams",
  description:
    "List the workspace's teams. Resolve a team name or key to its id for createIssue and filters. Returns a page plus a cursor.",
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
      teams: {
        nodes: z.infer<typeof outputSchema>["teams"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_TEAMS, {
      first: input.limit ?? 50,
      after: input.cursor,
    });

    return {
      teams: data.teams.nodes,
      nextCursor: data.teams.pageInfo.hasNextPage
        ? data.teams.pageInfo.endCursor
        : null,
      hasMore: data.teams.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
