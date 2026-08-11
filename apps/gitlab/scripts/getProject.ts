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
    projectId: z
      .string()
      .describe("Numeric id or URL-encoded group/project path."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int(),
  path_with_namespace: z.string(),
  name: z.string().nullable().optional(),
  description: z.union([z.string(), z.null()]).optional(),
  default_branch: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
  visibility: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getProject",
  title: "Get Project",
  description:
    "Get one project's metadata by id or path. A cheap way to confirm a projectId and read default_branch before committing or opening a merge request.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getProject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
