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
      .enum(["active", "closed"])
      .describe("Filter by milestone state.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      state: z.string().nullable().optional(),
      due_date: z.union([z.string(), z.null()]).optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listMilestones",
  title: "List Milestones",
  description:
    "List a project's milestones — call this to turn a milestone title into the milestoneId createIssue takes.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/milestones`,
    );
    if (input.state !== undefined) {
      url.searchParams.set("state", String(input.state));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listMilestones");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
