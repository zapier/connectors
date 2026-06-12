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
        "Full path of the folder to create, e.g. /Projects/2026. Must start with a slash; max 255 chars.",
      ),
    autorename: z
      .boolean()
      .describe(
        "If a folder already exists at the path, create one with a numbered suffix instead of failing. Default false.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "createFolder",
  title: "Create Folder",
  description:
    "Create a new folder at a Dropbox path. Returns the created folder's metadata. Parent folders are created as needed.",
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
    const res = await ctx.fetch(`${API_BASE}/2/files/create_folder_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify({ path: input.path, autorename: input.autorename }),
    });
    // create_folder_v2 wraps the created folder under `.metadata`; lift + map the
    // wire `.tag` discriminator to a clean `type` field.
    const data = await readDropbox<{ metadata: unknown }>("createFolder", res);
    return mapEntry(data.metadata);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
