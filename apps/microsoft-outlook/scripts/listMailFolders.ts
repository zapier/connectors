#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  GRAPH_BASE,
  mailboxRoot,
  outlookFetch,
  toListResult,
} from "../lib/graph.ts";

const inputSchema = z
  .object({
    parentFolderId: z
      .string()
      .describe(
        "Omit to list top-level folders. Set a folder id (from a previous call) or a well-known name (inbox, drafts, sentitems, deleteditems, archive, junkemail) to list that folder's subfolders.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Folders per page. Defaults to 20 when omitted; pass a value when you need a specific number.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pagination cursor from a previous response's next_cursor. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      parentFolderId: z.string().optional(),
      childFolderCount: z.number().optional(),
      unreadItemCount: z.number().optional(),
      totalItemCount: z.number().optional(),
    }),
  ),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listMailFolders",
  title: "List Mail Folders",
  description:
    "List mail folders. Returns top-level folders by default; pass parentFolderId to list a folder's subfolders. The entry point for resolving a folder id to pass as folderId to listMessages or destinationId to moveMessage.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    // `@odata.nextLink` is an opaque full URL — when paging, fetch it verbatim
    // and skip rebuilding the path/query.
    let url: string;
    if (input.cursor !== undefined) {
      url = input.cursor;
    } else {
      const root = mailboxRoot(input.mailbox);
      const path =
        input.parentFolderId !== undefined
          ? `${root}/mailFolders/${encodeURIComponent(input.parentFolderId)}/childFolders`
          : `${root}/mailFolders`;
      const query = buildListQuery({ limit: input.limit ?? 20 });
      url = `${GRAPH_BASE}${path}${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listMailFolders", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
