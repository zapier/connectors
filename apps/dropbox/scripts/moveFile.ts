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
        "Current path or id of the item to move, e.g. /Inbox/report.pdf or id:abc123.",
      ),
    to_path: z
      .string()
      .describe(
        "Destination path including the new filename, e.g. /Archive/report.pdf. To rename, keep the same folder and change the last segment.",
      ),
    autorename: z
      .boolean()
      .describe(
        "If an item already exists at to_path, move to a numbered variant instead of failing. Default false.",
      )
      .optional(),
    allow_ownership_transfer: z
      .boolean()
      .describe(
        "Allow the move even when it transfers ownership of the content. Default false.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "moveFile",
  title: "Move File",
  description:
    "Move (or rename) a file or folder. Renaming is moving to a new path in the same folder — there is no separate rename tool. Works on files and folders alike.",
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
    const res = await ctx.fetch(`${API_BASE}/2/files/move_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({
        from_path: input.from_path,
        to_path: input.to_path,
        autorename: input.autorename,
        allow_ownership_transfer: input.allow_ownership_transfer,
      }),
    });
    // Single-item move_v2 is synchronous and wraps the moved item under `.metadata`;
    // lift + map the wire `.tag` discriminator to a clean `type` field.
    const data = await readDropbox<{ metadata: unknown }>("moveFile", res);
    return mapEntry(data.metadata);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
