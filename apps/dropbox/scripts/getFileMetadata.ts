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
    path: z
      .string()
      .describe(
        "Path or id of the item, e.g. /Documents/report.pdf or id:abc123.",
      ),
    include_deleted: z
      .boolean()
      .describe("Return metadata even if the item was deleted. Default false.")
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "getFileMetadata",
  title: "Get File Metadata",
  description:
    "Get metadata (name, path, size, rev, type, timestamps) for a single file or folder by path or id. Use to confirm a path exists or fetch its id/rev before acting.",
  inputSchema,
  outputSchema: entrySchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${API_BASE}/2/files/get_metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({
        path: input.path,
        include_deleted: input.include_deleted,
      }),
    });
    // get_metadata returns the Entry directly (no `.metadata` envelope); map the
    // wire `.tag` discriminator to a clean `type` field.
    const data = await readDropbox("getFileMetadata", res);
    return mapEntry(data);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
