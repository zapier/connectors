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
    issueIid: z
      .number()
      .int()
      .describe("Project-scoped issue iid (not the global id)."),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  title: z.string(),
  description: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
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
  milestone: z
    .object({ id: z.number().int(), title: z.string() })
    .nullable()
    .optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getIssue",
  title: "Get Issue",
  description: "Get one issue including its full markdown description.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/issues/${encodeURIComponent(input.issueIid)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getIssue");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
