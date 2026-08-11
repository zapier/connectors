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
    search: z.string().describe("The search term."),
    scope: z
      .enum([
        "projects",
        "issues",
        "merge_requests",
        "milestones",
        "users",
        "blobs",
        "commits",
      ])
      .describe(
        "What to search. blobs is code; commits and blobs need Advanced Search.",
      ),
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
  items: z
    .array(z.record(z.string(), z.any()))
    .describe("Result objects; shape depends on the scope."),
  scope: z
    .string()
    .nullable()
    .describe("The scope that was searched.")
    .optional(),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "search",
  title: "Search",
  description:
    "Search globally across all projects, issues, merge requests, milestones, users, code (blobs), or commits the token can see. Use searchProject or searchGroup to narrow the scope. The blobs and commits scopes require GitLab Advanced Search (Premium/Ultimate).",
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
    const url = new URL(`https://gitlab.com/api/v4/search`);
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    if (input.scope !== undefined) {
      url.searchParams.set("scope", String(input.scope));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab search");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
