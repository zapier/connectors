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
        'The issue to label, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    labelId: z
      .uuid()
      .describe("Label id to add. Resolve a label name with listLabels."),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The issue's UUID."),
  identifier: z.string().describe('Human identifier, e.g. "ENG-118".'),
  title: z.string(),
  url: z.string().describe("The issue's URL in Linear."),
});

const ADD_ISSUE_LABEL = `
mutation IssueAddLabel($id: String!, $labelId: String!) {
  issueAddLabel(id: $id, labelId: $labelId) {
    success
    issue { id identifier title url }
  }
}`;

const definition = defineTool({
  name: "addIssueLabel",
  title: "Add Issue Label",
  description:
    "Add a single label to a Linear issue without disturbing its other labels (additive, unlike replacing the full label set).",
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
      issueAddLabel: { issue: z.infer<typeof outputSchema> };
    }>(ctx.fetch, ADD_ISSUE_LABEL, {
      id: input.issueId,
      labelId: input.labelId,
    });
    return data.issueAddLabel.issue;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
