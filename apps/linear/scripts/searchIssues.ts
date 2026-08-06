#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    query: z.string().describe("Text to match in the issue title.").optional(),
    teamId: z
      .uuid()
      .describe("Restrict to a team. Resolve with listTeams.")
      .optional(),
    assigneeId: z
      .uuid()
      .describe(
        "Restrict to an assignee. Resolve with listUsers, or use getViewer for your own issues.",
      )
      .optional(),
    stateId: z
      .uuid()
      .describe(
        "Restrict to a workflow state. Resolve with listWorkflowStates.",
      )
      .optional(),
    projectId: z
      .uuid()
      .describe("Restrict to a project. Resolve with listProjects.")
      .optional(),
    labelId: z
      .uuid()
      .describe(
        "Restrict to issues carrying this label. Resolve with listLabels.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max issues to return. Defaults to 25 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  issues: z.array(
    z.object({
      id: z.uuid(),
      identifier: z.string(),
      title: z.string(),
      url: z.string(),
      state: z.object({ name: z.string() }).nullable().optional(),
      assignee: z.object({ name: z.string() }).nullable().optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more issues are available."),
});

const SEARCH_ISSUES = `
query Issues($filter: IssueFilter, $first: Int, $after: String) {
  issues(filter: $filter, first: $first, after: $after) {
    nodes { id identifier title url state { name } assignee { name } }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "searchIssues",
  title: "Search Issues",
  description:
    "Find Linear issues by title text, assignee, state, team, project, or label. Returns a page of compact rows plus a cursor.",
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
    const filter: Record<string, unknown> = {};
    if (input.query !== undefined) filter.title = { contains: input.query };
    if (input.teamId !== undefined) filter.team = { id: { eq: input.teamId } };
    if (input.assigneeId !== undefined)
      filter.assignee = { id: { eq: input.assigneeId } };
    if (input.stateId !== undefined)
      filter.state = { id: { eq: input.stateId } };
    if (input.projectId !== undefined)
      filter.project = { id: { eq: input.projectId } };
    if (input.labelId !== undefined)
      filter.labels = { some: { id: { eq: input.labelId } } };

    const data = await linearGraphql<{
      issues: {
        nodes: z.infer<typeof outputSchema>["issues"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, SEARCH_ISSUES, {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      first: input.limit ?? 25,
      after: input.cursor,
    });

    return {
      issues: data.issues.nodes,
      nextCursor: data.issues.pageInfo.hasNextPage
        ? data.issues.pageInfo.endCursor
        : null,
      hasMore: data.issues.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
