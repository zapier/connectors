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
import { attachmentListItemSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Message id from listMessages or another message tool. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read from instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Attachments per page. Defaults to 20 when omitted; pass a value when you need a specific number.",
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
  items: z.array(attachmentListItemSchema),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listAttachments",
  title: "List Attachments",
  description:
    "List the attachments on a message — name, content type, size, kind, and inline flag. Resolve the messageId via listMessages first, then use getAttachment to download a specific one's bytes. A message's hasAttachments is false when it has only inline attachments, so still call this to check for them.",
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
      const path = `${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
        input.messageId,
      )}/attachments`;
      const query = buildListQuery({ limit: input.limit ?? 20 });
      url = `${GRAPH_BASE}${path}${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listAttachments", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
