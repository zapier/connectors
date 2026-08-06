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
        "Team the issue belongs to. Resolve a team name with listTeams.",
      ),
    title: z.string().describe("Issue title."),
    description: z.string().describe("Issue body in Markdown.").optional(),
    priority: z
      .number()
      .int()
      .gte(0)
      .lte(4)
      .describe("Priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low.")
      .optional(),
    assigneeId: z
      .uuid()
      .describe(
        "Assignee user id. Resolve with listUsers; use getViewer for yourself.",
      )
      .optional(),
    stateId: z
      .uuid()
      .describe("Workflow state (status) id. Resolve with listWorkflowStates.")
      .optional(),
    labelIds: z
      .array(z.uuid())
      .describe("Label ids to attach. Resolve with listLabels.")
      .optional(),
    projectId: z
      .uuid()
      .describe("Project id. Resolve with listProjects.")
      .optional(),
    projectMilestoneId: z
      .uuid()
      .describe("Project milestone id. Resolve with listProjectMilestones.")
      .optional(),
    cycleId: z
      .uuid()
      .describe("Cycle (sprint) id. Resolve with listCycles.")
      .optional(),
    parentId: z
      .uuid()
      .describe("Parent issue id to nest this issue under.")
      .optional(),
    dueDate: z.string().describe("Due date as YYYY-MM-DD.").optional(),
    estimate: z.number().describe("Point estimate.").optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The issue's UUID."),
  identifier: z.string().describe('Human identifier, e.g. "ENG-118".'),
  title: z.string(),
  url: z.string().describe("The issue's URL in Linear."),
});

const CREATE_ISSUE = `
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier title url }
  }
}`;

const definition = defineTool({
  name: "createIssue",
  title: "Create Issue",
  description:
    "Create a Linear issue in a team, with optional assignee, state, labels, project, cycle, priority, and due date.",
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
      issueCreate: { issue: z.infer<typeof outputSchema> };
    }>(ctx.fetch, CREATE_ISSUE, { input });
    return data.issueCreate.issue;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
