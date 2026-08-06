#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    projectId: z
      .uuid()
      .describe("Project whose milestones to list. Resolve with listProjects."),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max milestones to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  milestones: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      targetDate: z.string().describe("YYYY-MM-DD.").nullable().optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more milestones are available."),
});

const LIST_PROJECT_MILESTONES = `
query ProjectMilestones($id: String!, $first: Int, $after: String) {
  project(id: $id) {
    projectMilestones(first: $first, after: $after) {
      nodes { id name targetDate }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const definition = defineTool({
  name: "listProjectMilestones",
  title: "List Project Milestones",
  description:
    "List a project's milestones. Resolve a milestone name to its id for projectMilestoneId inputs. Returns a page plus a cursor.",
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
      project: {
        projectMilestones: {
          nodes: z.infer<typeof outputSchema>["milestones"];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(ctx.fetch, LIST_PROJECT_MILESTONES, {
      id: input.projectId,
      first: input.limit ?? 50,
      after: input.cursor,
    });

    const connection = data.project.projectMilestones;
    return {
      milestones: connection.nodes,
      nextCursor: connection.pageInfo.hasNextPage
        ? connection.pageInfo.endCursor
        : null,
      hasMore: connection.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
