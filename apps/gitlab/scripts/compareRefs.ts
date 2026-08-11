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
    from: z.string().describe("Base ref (branch, tag, or sha)."),
    to: z.string().describe("Target ref to compare against from."),
  })
  .strict();
const outputSchema = z.object({
  commits: z.array(
    z.object({ id: z.string(), title: z.string().nullable().optional() }),
  ),
  diffs: z.array(
    z.object({
      old_path: z.string(),
      new_path: z.string(),
      diff: z.string().nullable().optional(),
    }),
  ),
  compare_same_ref: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "compareRefs",
  title: "Compare Refs",
  description:
    "Compare two refs and return the commits and diff between them. Content-heavy — comparing far-apart refs returns large diffs.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/compare`,
    );
    if (input.from !== undefined) {
      url.searchParams.set("from", String(input.from));
    }
    if (input.to !== undefined) {
      url.searchParams.set("to", String(input.to));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab compareRefs");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
