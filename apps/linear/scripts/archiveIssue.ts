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
        'The issue to archive, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
  })
  .strict();

const outputSchema = z.object({
  success: z.boolean().describe("True if the issue was archived."),
});

const ARCHIVE_ISSUE = `
mutation IssueArchive($id: String!) {
  issueArchive(id: $id) {
    success
  }
}`;

const definition = defineTool({
  name: "archiveIssue",
  title: "Archive Issue",
  description:
    "Archive a Linear issue. This is Linear's reversible 'delete' — the issue is recoverable from the archive, not hard-deleted.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    // Archiving is reversible (the issue is recoverable from the archive), so
    // this is deliberately not marked destructive.
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const data = await linearGraphql<{
      issueArchive: z.infer<typeof outputSchema>;
    }>(ctx.fetch, ARCHIVE_ISSUE, { id: input.issueId });
    return data.issueArchive;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
