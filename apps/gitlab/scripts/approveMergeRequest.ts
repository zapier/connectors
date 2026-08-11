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
    mergeRequestIid: z
      .number()
      .int()
      .describe("Project-scoped merge request iid."),
    approve: z.boolean().describe("true to approve (default)").optional(),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  approved: z.boolean(),
  approvals_left: z.number().int().nullable().optional(),
  approved_by: z.array(z.string()).nullable().optional(),
});

const definition = defineTool({
  name: "approveMergeRequest",
  title: "Approve Merge Request",
  description:
    "Approve a merge request, or revoke your approval (approve=false targets the unapprove endpoint). Required-approval gates are a Premium/Ultimate feature.",
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
    const action = input.approve === false ? "unapprove" : "approve";
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}/${action}`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await throwIfNotOk(res, "Gitlab approveMergeRequest");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
