#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    teamId: z
      .uuid()
      .describe("Restrict to a team. Resolve with listTeams.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max projects to return. Defaults to 25 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  projects: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      state: z.string().describe("Project state.").optional(),
      url: z.string(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more projects are available."),
});

const LIST_PROJECTS = `
query Projects($filter: ProjectFilter, $first: Int, $after: String) {
  projects(filter: $filter, first: $first, after: $after) {
    nodes { id name state url }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listProjects",
  title: "List Projects",
  description:
    "List Linear projects, optionally scoped to a team. Returns a page of projects plus a cursor. Resolve a project name to its id.",
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
    const filter =
      input.teamId !== undefined
        ? { accessibleTeams: { some: { id: { eq: input.teamId } } } }
        : undefined;

    const data = await linearGraphql<{
      projects: {
        nodes: z.infer<typeof outputSchema>["projects"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_PROJECTS, {
      filter,
      first: input.limit ?? 25,
      after: input.cursor,
    });

    return {
      projects: data.projects.nodes,
      nextCursor: data.projects.pageInfo.hasNextPage
        ? data.projects.pageInfo.endCursor
        : null,
      hasMore: data.projects.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
