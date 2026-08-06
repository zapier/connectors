#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    teamId: z
      .uuid()
      .describe(
        "Team whose workflow states to list — states are team-scoped. Resolve with listTeams.",
      ),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max states to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  states: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: z
        .string()
        .describe(
          "One of backlog, unstarted, started, completed, canceled, triage.",
        ),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more states are available."),
});

const LIST_WORKFLOW_STATES = `
query WorkflowStates($filter: WorkflowStateFilter, $first: Int, $after: String) {
  workflowStates(filter: $filter, first: $first, after: $after) {
    nodes { id name type }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listWorkflowStates",
  title: "List Workflow States",
  description:
    "List a team's workflow states (statuses). Resolve a status name to its id for stateId inputs. Returns a page plus a cursor.",
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
      workflowStates: {
        nodes: z.infer<typeof outputSchema>["states"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_WORKFLOW_STATES, {
      filter: { team: { id: { eq: input.teamId } } },
      first: input.limit ?? 50,
      after: input.cursor,
    });

    return {
      states: data.workflowStates.nodes,
      nextCursor: data.workflowStates.pageInfo.hasNextPage
        ? data.workflowStates.pageInfo.endCursor
        : null,
      hasMore: data.workflowStates.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
