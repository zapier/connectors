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
    mergeRequestIid: z
      .number()
      .int()
      .describe("Project-scoped merge request iid."),
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
      id: z.string().describe("Discussion (thread) id."),
      individual_note: z
        .boolean()
        .nullable()
        .describe("true for a standalone note")
        .optional(),
      notes: z
        .array(
          z.object({
            id: z.number().int(),
            body: z.string(),
            author: z.string().nullable().optional(),
            system: z.boolean().nullable().optional(),
            resolvable: z
              .boolean()
              .nullable()
              .describe(
                "Whether this note can be resolved (diff/thread notes).",
              )
              .optional(),
            resolved: z
              .boolean()
              .nullable()
              .describe("Whether this note is resolved.")
              .optional(),
            created_at: z
              .string()
              .datetime({ offset: true })
              .nullable()
              .optional(),
          }),
        )
        .nullable()
        .optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listMergeRequestDiscussions",
  title: "List Merge Request Discussions",
  description:
    "List the discussion threads on a merge request, including line-anchored diff notes and each thread's resolved/resolvable status — information the flat notes list omits. Use this to read prior review threads and see which are still unresolved before reviewing.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}/discussions`,
    );
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listMergeRequestDiscussions");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
