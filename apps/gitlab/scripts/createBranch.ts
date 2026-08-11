#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    projectId: z.string().describe("Numeric id or encoded path."),
    branch: z.string().describe("Name for the new branch."),
    ref: z
      .string()
      .describe("The source branch name or commit sha to branch from."),
  })
  .strict();
const outputSchema = z.object({
  name: z.string(),
  commit_sha: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createBranch",
  title: "Create Branch",
  description:
    "Create a branch from an existing ref. ref is required — there is no default; read getProject.default_branch when you want the default.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/branches`;
    const body: Record<string, unknown> = {};
    if (input.branch !== undefined) body["branch"] = input.branch;
    if (input.ref !== undefined) body["ref"] = input.ref;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab createBranch");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
