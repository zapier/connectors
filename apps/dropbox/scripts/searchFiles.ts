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
  tagged,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        'Text to match against file/folder names and (on eligible plans) file content, e.g. "forecast 2026".',
      ),
    path: z
      .string()
      .describe(
        "Limit the search to this folder path, e.g. /Documents. Omit to search everywhere.",
      )
      .optional(),
    file_status: z
      .enum(["active", "deleted"])
      .describe("Whether to search active files (default) or deleted files.")
      .optional(),
    filename_only: z
      .boolean()
      .describe(
        "Match only names, not file content. Default false (full-text content search requires a paid Dropbox plan).",
      )
      .optional(),
    file_extensions: z
      .array(z.string())
      .describe(
        'Restrict to these extensions, without the dot, e.g. ["pdf","docx"].',
      )
      .optional(),
    file_categories: z
      .array(
        z.enum([
          "image",
          "document",
          "pdf",
          "spreadsheet",
          "presentation",
          "audio",
          "video",
          "folder",
          "paper",
          "others",
        ]),
      )
      .describe("Restrict to these content categories.")
      .optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Max matches per page (1–1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      ),
    cursor: z
      .string()
      .describe(
        "Pass the cursor from a previous searchFiles response to fetch the next page. When set, other inputs are ignored.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const outputSchema = z.object({
  matches: z.array(entrySchema),
  cursor: z
    .string()
    .describe("Pass to searchFiles to fetch the next page.")
    .optional(),
  has_more: z
    .boolean()
    .describe("True if more matches are available via cursor."),
});

const definition = defineTool({
  name: "searchFiles",
  title: "Search Files",
  description:
    "Search for files and folders by name or content across the account (or under a path). The modern full-text search; use this to find an item before acting on it.",
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
    // Continuation pages hit a sibling /continue_v2 endpoint with a cursor-only body;
    // first-page filters all nest under `options`, with `limit` → `options.max_results`.
    let url: string;
    let body: Record<string, unknown>;
    if (input.cursor) {
      url = `${API_BASE}/2/files/search/continue_v2`;
      body = { cursor: input.cursor };
    } else {
      const options: Record<string, unknown> = {
        max_results: input.limit ?? 20,
      };
      if (input.path !== undefined) options.path = input.path;
      if (input.file_status !== undefined)
        options.file_status = tagged(input.file_status);
      if (input.filename_only !== undefined)
        options.filename_only = input.filename_only;
      if (input.file_extensions !== undefined)
        options.file_extensions = input.file_extensions;
      if (input.file_categories !== undefined)
        options.file_categories = input.file_categories.map(tagged);
      url = `${API_BASE}/2/files/search_v2`;
      body = { query: input.query, options };
    }
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...pathRootHeader(input.namespace_id),
      },
      body: JSON.stringify(body),
    });
    const data = await readDropbox<{
      matches?: Array<{ metadata?: { metadata?: unknown } }>;
      cursor?: string;
      has_more?: boolean;
    }>("searchFiles", res);
    return {
      // Matches are double-nested — each is `{ metadata: { metadata: <Entry> } }`,
      // a "metadata" union wrapping the actual tagged file/folder Entry. Lift twice,
      // then map the wire `.tag` discriminator to a clean `type`.
      matches: (data.matches ?? []).map((m) => mapEntry(m?.metadata?.metadata)),
      cursor: data.cursor,
      has_more: data.has_more ?? false,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
