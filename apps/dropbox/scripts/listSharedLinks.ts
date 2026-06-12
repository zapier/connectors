#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  mapSharedLink,
  readDropbox,
  sharedLinkSchema,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Restrict to links for this file or folder path, e.g. /Documents/report.pdf. Omit to list all links.",
      )
      .optional(),
    direct_only: z
      .boolean()
      .describe(
        "If true, only links that point directly at the path (not links to a parent folder). Default false.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pass the cursor from a previous listSharedLinks response to fetch the next page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  links: z.array(sharedLinkSchema),
  cursor: z
    .string()
    .describe("Pass to listSharedLinks to fetch the next page.")
    .optional(),
  has_more: z.boolean().optional(),
});

const definition = defineTool({
  name: "listSharedLinks",
  title: "List Shared Links",
  description:
    "List existing shared links, optionally for a specific file or folder path. Use to find a link's URL before modifying it, or to check whether a path is already shared.",
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
    // `path` and `cursor` are mutually exclusive on the wire — a continuation page
    // sends cursor alone; otherwise send the path/direct_only filter.
    const body = input.cursor
      ? { cursor: input.cursor }
      : { path: input.path, direct_only: input.direct_only };
    const res = await ctx.fetch(`${API_BASE}/2/sharing/list_shared_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readDropbox<{
      links?: unknown[];
      cursor?: string;
      has_more?: boolean;
    }>("listSharedLinks", res);
    return {
      // Each link carries a wire `.tag` discriminator — map it to a clean `type`
      // and add the direct-download variant.
      links: (data.links ?? []).map(mapSharedLink),
      cursor: data.cursor,
      has_more: data.has_more,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
