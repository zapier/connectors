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
    mergeRequestIid: z
      .number()
      .int()
      .describe("Project-scoped merge request iid."),
    per_page: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Changed files per page (default 10). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      old_path: z.string(),
      new_path: z.string(),
      new_file: z.boolean().nullable().optional(),
      deleted_file: z.boolean().nullable().optional(),
      renamed_file: z.boolean().nullable().optional(),
      diff: z.string().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getMergeRequestDiffs",
  title: "Get Merge Request Diffs",
  description:
    "Get the file diffs for a merge request, one entry per changed file. Content-heavy — the default page is small; page the tail via nextPage.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}/diffs`,
    );
    url.searchParams.set("per_page", String(input.per_page ?? 10));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getMergeRequestDiffs");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
