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
        'The issue to remove the label from, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    labelId: z
      .uuid()
      .describe("Label id to remove. Resolve a label name with listLabels."),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The issue's UUID."),
  identifier: z.string().describe('Human identifier, e.g. "ENG-118".'),
  title: z.string(),
  url: z.string().describe("The issue's URL in Linear."),
});

const REMOVE_ISSUE_LABEL = `
mutation IssueRemoveLabel($id: String!, $labelId: String!) {
  issueRemoveLabel(id: $id, labelId: $labelId) {
    success
    issue { id identifier title url }
  }
}`;

const definition = defineTool({
  name: "removeIssueLabel",
  title: "Remove Issue Label",
  description:
    "Remove a single label from a Linear issue, leaving its other labels intact.",
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
    const data = await linearGraphql<{
      issueRemoveLabel: { issue: z.infer<typeof outputSchema> };
    }>(ctx.fetch, REMOVE_ISSUE_LABEL, {
      id: input.issueId,
      labelId: input.labelId,
    });
    return data.issueRemoveLabel.issue;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
