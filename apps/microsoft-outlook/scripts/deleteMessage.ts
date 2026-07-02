#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, mailboxRoot, outlookFetch } from "../lib/graph.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Opaque message id from listMessages or getMessage. Case-sensitive. With ImmutableId (sent on every request), ids stay stable across folder moves on M365 and Exchange Online work or school mailboxes; on consumer Outlook.com accounts Graph may ignore ImmutableId and ids can still change. Always use the id returned by moveMessage for follow-up calls.",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to delete from instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

// Graph's DELETE /messages/{id} returns 204 with no body, so there is nothing
// to echo back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "deleteMessage",
  title: "Delete Message",
  description:
    "Soft-delete a message: it moves to the Deleted Items folder and is reversible (move it back out to restore). Resolve the message id via listMessages first.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
      input.messageId,
    )}`;
    await outlookFetch(ctx.fetch, "deleteMessage", url, {
      method: "DELETE",
    });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
