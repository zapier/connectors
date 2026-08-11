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
      name: z.string(),
      color: z.string().nullable().optional(),
      description: z.union([z.string(), z.null()]).optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listLabels",
  title: "List Labels",
  description:
    "List a project's labels — call this to get valid label names before setting labels on an issue or merge request.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/labels`,
    );
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listLabels");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
