#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { listResult } from "../lib/gitlab.ts";

const inputSchema = z
  .object({
    projectId: z.string().describe("Numeric id or encoded path."),
    state: z
      .enum(["opened", "closed", "all"])
      .describe("Filter by state (default opened).")
      .optional(),
    labels: z
      .array(z.string())
      .describe("Only issues carrying all of these labels.")
      .optional(),
    assignee_username: z
      .string()
      .describe("Filter to one assignee. Resolve with findUsers.")
      .optional(),
    milestone: z
      .string()
      .describe("Filter to one milestone (title). Resolve with listMilestones.")
      .optional(),
    per_page: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (default 20). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      iid: z.number().int(),
      title: z.string(),
      state: z.string().nullable().optional(),
      web_url: z.string().nullable().optional(),
      labels: z.array(z.string()).nullable().optional(),
      assignees: z
        .array(
          z.object({
            id: z.number().int(),
            username: z.string(),
            name: z.string().nullable().optional(),
          }),
        )
        .nullable()
        .optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listIssues",
  title: "List Issues",
  description:
    "List issues in a project, filterable by state, labels, assignee, or milestone. Returns each issue's project-scoped iid, the identifier getIssue/updateIssue/addIssueComment take.",
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
    const url = new URL(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/issues`,
    );
    if (input.state !== undefined) {
      url.searchParams.set("state", String(input.state));
    }
    if (input.labels !== undefined) {
      url.searchParams.set("labels", String(input.labels));
    }
    if (input.assignee_username !== undefined) {
      url.searchParams.set(
        "assignee_username",
        String(input.assignee_username),
      );
    }
    if (input.milestone !== undefined) {
      url.searchParams.set("milestone", String(input.milestone));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listIssues");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
