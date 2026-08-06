#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    teamId: z
      .uuid()
      .describe("Restrict to a team's labels. Resolve with listTeams.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max labels to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  labels: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      color: z.string().describe("Hex color, e.g. #4EA7FC.").optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more labels are available."),
});

const LIST_LABELS = `
query IssueLabels($filter: IssueLabelFilter, $first: Int, $after: String) {
  issueLabels(filter: $filter, first: $first, after: $after) {
    nodes { id name color }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listLabels",
  title: "List Labels",
  description:
    "List issue labels, optionally scoped to a team. Resolve a label name to its id for labelId inputs. Returns a page plus a cursor.",
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
      issueLabels: {
        nodes: z.infer<typeof outputSchema>["labels"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_LABELS, {
      filter:
        input.teamId !== undefined
          ? { team: { id: { eq: input.teamId } } }
          : undefined,
      first: input.limit ?? 50,
      after: input.cursor,
    });

    return {
      labels: data.issueLabels.nodes,
      nextCursor: data.issueLabels.pageInfo.hasNextPage
        ? data.issueLabels.pageInfo.endCursor
        : null,
      hasMore: data.issueLabels.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
