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
    search: z
      .string()
      .describe("Filter projects by name or path substring.")
      .optional(),
    membership: z
      .boolean()
      .describe(
        "Limit to projects the token identity is a member of. Defaults to true.",
      )
      .optional(),
    per_page: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (default 20). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    page: z.number().int().describe("1-based page number.").optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      path_with_namespace: z.string().describe("The group/project full path."),
      name: z.string().nullable().optional(),
      web_url: z.string().nullable().optional(),
      default_branch: z.string().nullable().optional(),
    }),
  ),
  nextPage: z
    .union([
      z
        .number()
        .int()
        .describe("Pass as page for the next page; null when done."),
      z.null().describe("Pass as page for the next page; null when done."),
    ])
    .describe("Pass as page for the next page; null when done.")
    .optional(),
});

const definition = defineTool({
  name: "listProjects",
  title: "List Projects",
  description:
    "List or search projects the token can see. Call this to turn a project name into the projectId every other tool needs.",
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
    const url = new URL(`https://gitlab.com/api/v4/projects`);
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    if (input.membership !== undefined) {
      url.searchParams.set("membership", String(input.membership));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listProjects");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
