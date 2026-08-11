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
    ref: z.string().describe("Filter to one branch or tag.").optional(),
    status: z
      .enum([
        "running",
        "pending",
        "success",
        "failed",
        "canceled",
        "skipped",
        "manual",
        "created",
      ])
      .describe("Filter by pipeline status.")
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
      id: z.number().int(),
      status: z.string(),
      ref: z.string().nullable().optional(),
      sha: z.string().nullable().optional(),
      web_url: z.string().nullable().optional(),
      created_at: z.string().datetime({ offset: true }).nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listPipelines",
  title: "List Pipelines",
  description: "List pipelines for a project, filterable by ref or status.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/pipelines`,
    );
    if (input.ref !== undefined) {
      url.searchParams.set("ref", String(input.ref));
    }
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listPipelines");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
