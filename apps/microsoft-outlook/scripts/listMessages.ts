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
import { messageListItemSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    folderId: z
      .string()
      .describe(
        "Restrict to one folder: a folder id from listMailFolders, or a well-known name (inbox, drafts, sentitems, deleteditems, archive, junkemail). Omit to list across all folders.",
      )
      .optional(),
    search: z
      .string()
      .describe(
        'Full-text KQL search over the default from/subject/body properties, e.g. "subject:invoice from:acme". Results are sorted by the date and time sent. Omit to list newest-first.',
      )
      .optional(),
    filter: z
      .string()
      .describe(
        'OData $filter predicate for exact matches, e.g. "isRead eq false" or "importance eq \'high\'". Use search for free-text instead.',
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
        "Messages per page. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(messageListItemSchema),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listMessages",
  title: "List Messages",
  description:
    'Search or list mailbox messages. Listing is newest-first; search results (KQL, e.g. "subject:invoice from:acme") are ordered by sent date, not recency. Scope with folderId; exact-match with filter. The entry point for resolving a message id before getMessage/updateMessage/moveMessage.',
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
        input.folderId !== undefined
          ? `${root}/mailFolders/${encodeURIComponent(input.folderId)}/messages`
          : `${root}/messages`;
      const query = buildListQuery({
        limit: input.limit ?? 10,
        search: input.search,
        filter: input.filter,
      });
      url = `${GRAPH_BASE}${path}${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listMessages", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
