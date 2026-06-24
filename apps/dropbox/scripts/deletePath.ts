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
        "Path or id of the file or folder to delete, e.g. /Old/notes.txt or id:abc123.",
      ),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "deletePath",
  title: "Delete Path",
  description:
    "Delete a file or folder (and everything inside a folder). Works on files and folders alike. Deleted items can be recovered from Dropbox for a limited time.",
  inputSchema,
  outputSchema: entrySchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${API_BASE}/2/files/delete_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({ path: input.path }),
    });
    // delete_v2 wraps the deleted item under `.metadata`; lift + map the wire
    // `.tag` discriminator to a clean `type` field.
    const data = await readDropbox<{ metadata: unknown }>("deletePath", res);
    return mapEntry(data.metadata);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
