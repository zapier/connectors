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
    filePath: z
      .string()
      .describe("Path to the file in the repo (the connector URL-encodes it)."),
    ref: z.string().describe("Branch, tag, or commit sha to read from."),
  })
  .strict();
const outputSchema = z.object({
  file_path: z.string(),
  ref: z.string().nullable().optional(),
  content: z.string(),
});

const definition = defineTool({
  name: "getFile",
  title: "Get File",
  description:
    "Read a file's decoded text contents at a ref. Steer to the specific file you need — reading a huge file floods context, and large binaries are out of scope.",
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
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/files/${encodeURIComponent(input.filePath)}/raw`,
    );
    if (input.ref !== undefined) {
      url.searchParams.set("ref", String(input.ref));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getFile");
    const content = await res.text();
    return { file_path: input.filePath, ref: input.ref, content };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
