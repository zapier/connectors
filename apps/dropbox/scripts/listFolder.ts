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
        'Folder path to list, e.g. /Documents. Use "" (empty string), NOT "/", for the account root.',
      ),
    recursive: z
      .boolean()
      .describe(
        "List contents of all subfolders too. Default false. Can return very large result sets — page with cursor.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(2000)
      .default(20)
      .describe(
        "Max entries per page (1–2000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      ),
    include_deleted: z
      .boolean()
      .describe("Include items that have been deleted. Default false.")
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pass the cursor from a previous listFolder response to fetch the next page. When set, all other inputs are ignored.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const outputSchema = z.object({
  entries: z.array(entrySchema),
  cursor: z
    .string()
    .describe("Pass to listFolder to fetch the next page.")
    .optional(),
  has_more: z
    .boolean()
    .describe("True if more entries are available via cursor."),
});

const definition = defineTool({
  name: "listFolder",
  title: "List Folder",
  description:
    "List the immediate contents (files and folders) of a Dropbox folder. Pass an empty string for the account root. Page the tail via the returned cursor; does not auto-paginate.",
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
      ? `${API_BASE}/2/files/list_folder/continue`
      : `${API_BASE}/2/files/list_folder`;
    const body = input.cursor
      ? { cursor: input.cursor }
      : {
          path: input.path,
          recursive: input.recursive,
          limit: input.limit,
          include_deleted: input.include_deleted,
        };
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify(body),
    });
    const data = await readDropbox<{
      entries?: unknown[];
      cursor?: string;
      has_more?: boolean;
    }>("listFolder", res);
    return {
      // Each entry carries a wire `.tag` discriminator — map it to a clean `type`.
      entries: (data.entries ?? []).map(mapEntry),
      cursor: data.cursor,
      has_more: data.has_more ?? false,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
