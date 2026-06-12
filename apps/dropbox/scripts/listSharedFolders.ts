#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, readDropbox } from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(20)
      .describe(
        "Max shared folders per page (1–1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      ),
    cursor: z
      .string()
      .describe(
        "Pass the cursor from a previous listSharedFolders response to fetch the next page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  folders: z.array(
    z.object({
      shared_folder_id: z
        .string()
        .describe(
          "Use as shared_folder_id in addFolderMember / removeFolderMember.",
        ),
      name: z.string(),
      path_lower: z.string().describe("Mounted path").optional(),
      access_type: z
        .string()
        .describe("The current account's access level on the folder.")
        .optional(),
    }),
  ),
  cursor: z
    .string()
    .describe("Pass to listSharedFolders to fetch the next page.")
    .optional(),
});

const definition = defineTool({
  name: "listSharedFolders",
  title: "List Shared Folders",
  description:
    "List the shared folders the current account is a member of. Use to resolve a shared_folder_id for addFolderMember / removeFolderMember.",
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
    // Continuation pages hit a sibling /continue endpoint with a cursor-only body.
    const url = input.cursor
      ? `${API_BASE}/2/sharing/list_folders/continue`
      : `${API_BASE}/2/sharing/list_folders`;
    const body = input.cursor
      ? { cursor: input.cursor }
      : { limit: input.limit };
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readDropbox<{ entries?: unknown[]; cursor?: string }>(
      "listSharedFolders",
      res,
    );
    // Folder items are plain objects (no `.tag` to unwrap) — the wire returns them
    // under `entries`; surface them as `folders`.
    return { folders: data.entries ?? [], cursor: data.cursor };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
