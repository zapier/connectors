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
    search: z
      .string()
      .describe("Filter branches by name substring.")
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
      name: z.string(),
      merged: z.boolean().nullable().optional(),
      protected: z.boolean().nullable().optional(),
      default: z.boolean().nullable().optional(),
      commit_sha: z.string().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listBranches",
  title: "List Branches",
  description: "List (or search) a project's branches.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/branches`,
    );
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listBranches");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
