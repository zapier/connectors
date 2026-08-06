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
        'The issue to update, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    title: z.string().describe("New title.").optional(),
    description: z.string().describe("New body in Markdown.").optional(),
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
        "New assignee user id. Pass null to unassign. Resolve with listUsers.",
      )
      .nullable()
      .optional(),
    stateId: z
      .uuid()
      .describe(
        "New workflow state (status) id. Resolve with listWorkflowStates.",
      )
      .optional(),
    projectId: z
      .uuid()
      .describe(
        "Move to this project (resolve with listProjects); pass null to remove from its project.",
      )
      .nullable()
      .optional(),
    projectMilestoneId: z
      .uuid()
      .describe("Project milestone id. Resolve with listProjectMilestones.")
      .optional(),
    cycleId: z
      .uuid()
      .describe("Cycle (sprint) id. Resolve with listCycles.")
      .optional(),
    dueDate: z
      .string()
      .describe("Due date as YYYY-MM-DD. Pass null to clear.")
      .nullable()
      .optional(),
    estimate: z.number().describe("Point estimate.").optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The issue's UUID."),
  identifier: z.string().describe('Human identifier, e.g. "ENG-118".'),
  title: z.string(),
  url: z.string().describe("The issue's URL in Linear."),
});

const UPDATE_ISSUE = `
mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id identifier title url }
  }
}`;

const definition = defineTool({
  name: "updateIssue",
  title: "Update Issue",
  description:
    "Update an existing Linear issue's fields — title, description, state, assignee, priority, project, cycle, or due date.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    // Build the IssueUpdateInput from only the fields the caller set. `null` is a
    // meaningful value for assigneeId/projectId/dueDate (it clears the field), so
    // include those whenever the key is present rather than testing for undefined.
    const inputPayload: Record<string, unknown> = {};
    if (input.title !== undefined) inputPayload.title = input.title;
    if (input.description !== undefined)
      inputPayload.description = input.description;
    if (input.priority !== undefined) inputPayload.priority = input.priority;
    if ("assigneeId" in input) inputPayload.assigneeId = input.assigneeId;
    if (input.stateId !== undefined) inputPayload.stateId = input.stateId;
    if ("projectId" in input) inputPayload.projectId = input.projectId;
    if (input.projectMilestoneId !== undefined)
      inputPayload.projectMilestoneId = input.projectMilestoneId;
    if (input.cycleId !== undefined) inputPayload.cycleId = input.cycleId;
    if ("dueDate" in input) inputPayload.dueDate = input.dueDate;
    if (input.estimate !== undefined) inputPayload.estimate = input.estimate;

    const data = await linearGraphql<{
      issueUpdate: { issue: z.infer<typeof outputSchema> };
    }>(ctx.fetch, UPDATE_ISSUE, { id: input.issueId, input: inputPayload });
    return data.issueUpdate.issue;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
