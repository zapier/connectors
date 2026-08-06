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
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The issue's UUID."),
  identifier: z.string().describe('Human identifier, e.g. "ENG-118".'),
  title: z.string(),
  url: z.string(),
  description: z.string().describe("Markdown body.").nullable().optional(),
  priority: z
    .number()
    .describe("0 none, 1 urgent, 2 high, 3 medium, 4 low.")
    .optional(),
  estimate: z.number().describe("Point estimate.").nullable().optional(),
  dueDate: z.string().describe("YYYY-MM-DD.").nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  state: z
    .object({
      id: z.uuid(),
      name: z.string(),
      type: z.string(),
    })
    .describe("Workflow state.")
    .optional(),
  assignee: z
    .object({ id: z.uuid(), name: z.string(), email: z.string().optional() })
    .nullable()
    .optional(),
  team: z
    .object({ id: z.uuid(), name: z.string(), key: z.string() })
    .optional(),
  project: z.object({ id: z.uuid(), name: z.string() }).nullable().optional(),
  labels: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        color: z.string().optional(),
      }),
    )
    .describe("Labels attached to the issue.")
    .optional(),
});

const GET_ISSUE = `
query Issue($id: String!) {
  issue(id: $id) {
    id identifier title url description priority estimate dueDate createdAt updatedAt
    state { id name type }
    assignee { id name email }
    team { id name key }
    project { id name }
    labels { nodes { id name color } }
  }
}`;

const definition = defineTool({
  name: "getIssue",
  title: "Get Issue",
  description:
    "Fetch a single Linear issue by its UUID or identifier, with its state, assignee, team, project, and labels.",
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
        labels?: { nodes: unknown[] };
      } & Record<string, unknown>;
    }>(ctx.fetch, GET_ISSUE, { id: input.issueId });
    const { labels, ...issue } = data.issue;
    // Flatten the labels connection to a plain array for the agent surface.
    return { ...issue, labels: labels?.nodes ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
