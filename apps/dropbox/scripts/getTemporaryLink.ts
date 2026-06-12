#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  readDropbox,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path or id of the file, e.g. /Documents/report.pdf or id:abc123. Folders are not supported.",
      ),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const outputSchema = z.object({
  link: z.string().describe("Direct download URL, valid for about 4 hours."),
  name: z.string().optional(),
  path_display: z.string().optional(),
  id: z.string().optional(),
  size: z.number().int().describe("File size in bytes.").optional(),
});

const definition = defineTool({
  name: "getTemporaryLink",
  title: "Get Temporary Link",
  description:
    "Get a direct, time-limited download URL (valid ~4 hours) for a file. Use this to fetch or hand off a file's bytes; for a permanent shareable link use createSharedLink instead, and for inline text content use getFileContents.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${API_BASE}/2/files/get_temporary_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({ path: input.path }),
    });
    // The link object isn't a tagged union, so no mapEntry — just project the link
    // plus the file fields Dropbox nests under `.metadata`.
    const data = await readDropbox<{
      link?: string;
      metadata?: {
        name?: string;
        path_display?: string;
        id?: string;
        size?: number;
      };
    }>("getTemporaryLink", res);
    return {
      link: data.link,
      name: data.metadata?.name,
      path_display: data.metadata?.path_display,
      id: data.metadata?.id,
      size: data.metadata?.size,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
