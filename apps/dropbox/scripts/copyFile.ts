#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  entrySchema,
  mapEntry,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  readDropbox,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    from_path: z
      .string()
      .describe(
        "Path or id of the item to copy, e.g. /Templates/base.docx or id:abc123.",
      ),
    to_path: z
      .string()
      .describe(
        "Destination path including the filename for the copy, e.g. /Projects/base.docx.",
      ),
    autorename: z
      .boolean()
      .describe(
        "If an item already exists at to_path, copy to a numbered variant instead of failing. Default false.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "copyFile",
  title: "Copy File",
  description:
    "Copy a file or folder to a new path. The original is left in place. Works on files and folders alike.",
  inputSchema,
  outputSchema: entrySchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${API_BASE}/2/files/copy_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({
        from_path: input.from_path,
        to_path: input.to_path,
        autorename: input.autorename,
      }),
    });
    // Single-item copy_v2 is synchronous and wraps the new item under `.metadata`;
    // lift + map the wire `.tag` discriminator to a clean `type` field.
    const data = await readDropbox<{ metadata: unknown }>("copyFile", res);
    return mapEntry(data.metadata);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
