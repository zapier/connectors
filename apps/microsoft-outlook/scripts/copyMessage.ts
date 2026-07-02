#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH_BASE,
  mailboxRoot,
  outlookFetch,
  parseGraphResponse,
} from "../lib/graph.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Opaque message id from listMessages or getMessage. Case-sensitive. With ImmutableId (sent on every request), ids stay stable across folder moves on M365 and Exchange Online work or school mailboxes; on consumer Outlook.com accounts Graph may ignore ImmutableId and ids can still change. Always use the id returned by moveMessage for follow-up calls.",
      ),
    destinationId: z
      .string()
      .describe(
        "Target folder: a folder id from listMailFolders, or a well-known name (inbox, archive, deleteditems, junkemail, drafts, sentitems).",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to copy within instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  parentFolderId: z.string(),
  subject: z.string(),
});

const definition = defineTool({
  name: "copyMessage",
  title: "Copy Message",
  description:
    "Copy a message into another folder, leaving the original in place. Resolve the message id via listMessages first. Returns the new copy, which has its own id distinct from the original.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
      input.messageId,
    )}/copy`;
    const res = await outlookFetch(ctx.fetch, "copyMessage", url, {
      method: "POST",
      body: JSON.stringify({ destinationId: input.destinationId }),
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
