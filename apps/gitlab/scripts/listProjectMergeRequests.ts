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
    projectId: z
      .string()
      .describe(
        "The project to list merge requests from (numeric id or encoded path).",
      ),
    state: z
      .enum(["opened", "closed", "merged", "all"])
      .describe("Filter by state (default opened).")
      .optional(),
    author_username: z.string().describe("Filter by author.").optional(),
    reviewer_username: z.string().describe("Filter by reviewer.").optional(),
    source_branch: z.string().describe("Filter by source branch.").optional(),
    target_branch: z.string().describe("Filter by target branch.").optional(),
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
      source_branch: z.string().nullable().optional(),
      target_branch: z.string().nullable().optional(),
      web_url: z.string().nullable().optional(),
      draft: z.boolean().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listProjectMergeRequests",
  title: "List Project Merge Requests",
  description:
    "List merge requests in one project. Use listGroupMergeRequests for a group scope or listMergeRequests for MRs assigned to or created by the token identity.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests`,
    );
    if (input.state !== undefined) {
      url.searchParams.set("state", String(input.state));
    }
    if (input.author_username !== undefined) {
      url.searchParams.set("author_username", String(input.author_username));
    }
    if (input.reviewer_username !== undefined) {
      url.searchParams.set(
        "reviewer_username",
        String(input.reviewer_username),
      );
    }
    if (input.source_branch !== undefined) {
      url.searchParams.set("source_branch", String(input.source_branch));
    }
    if (input.target_branch !== undefined) {
      url.searchParams.set("target_branch", String(input.target_branch));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listProjectMergeRequests");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
