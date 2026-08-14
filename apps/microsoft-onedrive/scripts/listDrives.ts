#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveSchema,
  GRAPH,
  graphFetch,
  listUrl,
  unwrapList,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum drives to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(driveSchema).describe("The drives available to the user."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listDrives",
  title: "List Drives",
  description:
    "List the drives available to the user, to resolve a driveId for other tools. Most personal accounts have a single drive; business accounts may have several.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = listUrl(`${GRAPH}/me/drives`, input);
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
