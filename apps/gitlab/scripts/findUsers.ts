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
    username: z.string().describe("Exact username lookup.").optional(),
    search: z.string().describe("Fuzzy name or username search.").optional(),
    per_page: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (default 20). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict()
  .refine((v) => !(v.username && v.search), {
    message: "Provide either username or search, not both.",
  });
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      username: z.string(),
      name: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "findUsers",
  title: "Find Users",
  description:
    "Find users by exact username or fuzzy search, to resolve the assignee/reviewer ids issue and merge-request tools take. Supply either username or search, not both.",
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
    const url = new URL(`https://gitlab.com/api/v4/users`);
    if (input.username !== undefined) {
      url.searchParams.set("username", String(input.username));
    }
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab findUsers");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
