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
    ref_name: z
      .string()
      .describe(
        "Branch, tag, or sha to list from (defaults to the default branch).",
      )
      .optional(),
    since: z
      .string()
      .datetime({ offset: true })
      .describe("ISO-8601 lower bound on commit date.")
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
      id: z.string().describe("Full commit sha."),
      short_id: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      author_name: z.string().nullable().optional(),
      created_at: z.string().datetime({ offset: true }).nullable().optional(),
      web_url: z.string().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listCommits",
  title: "List Commits",
  description: "List commits on a branch or across the repository.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/commits`,
    );
    if (input.ref_name !== undefined) {
      url.searchParams.set("ref_name", String(input.ref_name));
    }
    if (input.since !== undefined) {
      url.searchParams.set("since", String(input.since));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listCommits");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
