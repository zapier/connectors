#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { gitlabGraphql } from "../lib/gitlab.ts";

const inputSchema = z
  .object({
    namespacePath: z
      .string()
      .describe(
        "Full path of the project or group to list work items from (e.g. group/project or group).",
      ),
    types: z
      .array(z.string())
      .describe(
        "Filter by work-item type name, e.g. EPIC, ISSUE, TASK, OBJECTIVE.",
      )
      .optional(),
    state: z
      .enum(["opened", "closed", "all"])
      .describe("Filter by state (default opened).")
      .optional(),
    search: z.string().describe("Filter by title substring.").optional(),
    first: z
      .number()
      .int()
      .gte(1)
      .describe("Page size (default 20).")
      .optional(),
    after: z.string().describe("Cursor for the next page.").optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      iid: z.string().nullable(),
      title: z.string(),
      workItemType: z.string().nullable(),
      state: z.string(),
      webUrl: z.string(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

const QUERY = `
  query ListWorkItems($fullPath: ID!, $types: [IssueType!], $state: IssuableState, $search: String, $first: Int, $after: String) {
    namespace(fullPath: $fullPath) {
      workItems(types: $types, state: $state, search: $search, first: $first, after: $after) {
        pageInfo { endCursor hasNextPage }
        nodes { id iid title state webUrl workItemType { name } }
      }
    }
  }`;

interface WorkItemNode {
  id: string;
  iid: string | null;
  title: string;
  state: string;
  webUrl: string;
  workItemType?: { name?: string } | null;
}

const definition = defineTool({
  name: "listWorkItems",
  title: "List Work Items",
  description:
    "List work items (epics, issues, tasks, objectives) in a project or group, filterable by type and state. Work items are a Premium/Ultimate surface.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const data = (await gitlabGraphql(ctx.fetch, QUERY, {
      fullPath: input.namespacePath,
      types: input.types,
      state: input.state,
      search: input.search,
      first: input.first ?? 20,
      after: input.after,
    })) as {
      namespace?: {
        workItems?: {
          pageInfo: { endCursor: string | null; hasNextPage: boolean };
          nodes: WorkItemNode[];
        };
      };
    };
    const conn = data.namespace?.workItems;
    const nodes = conn?.nodes ?? [];
    return {
      items: nodes.map((n) => ({
        id: n.id,
        iid: n.iid,
        title: n.title,
        workItemType: n.workItemType?.name ?? null,
        state: n.state,
        webUrl: n.webUrl,
      })),
      nextCursor: conn?.pageInfo.hasNextPage
        ? (conn.pageInfo.endCursor ?? null)
        : null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
