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
    path: z
      .string()
      .describe("Subdirectory to list (defaults to repo root).")
      .optional(),
    ref: z
      .string()
      .describe("Branch, tag, or sha (defaults to the default branch).")
      .optional(),
    recursive: z.boolean().describe("Recurse into subdirectories.").optional(),
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
      id: z.string().nullable().optional(),
      name: z.string(),
      type: z.enum(["tree", "blob"]),
      path: z.string(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listRepositoryTree",
  title: "List Repository Tree",
  description:
    "List files and directories in a repository path — the way to discover what files exist before reading or committing.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/tree`,
    );
    if (input.path !== undefined) {
      url.searchParams.set("path", String(input.path));
    }
    if (input.ref !== undefined) {
      url.searchParams.set("ref", String(input.ref));
    }
    if (input.recursive !== undefined) {
      url.searchParams.set("recursive", String(input.recursive));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listRepositoryTree");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
