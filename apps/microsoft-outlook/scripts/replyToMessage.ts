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
        "Id of the message to reply to, from listMessages or getMessage. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    comment: z
      .string()
      .describe(
        "Reply text prepended above the quoted original. Plain text or HTML. Omit to send an empty-bodied reply.",
      )
      .optional(),
    replyAll: z
      .boolean()
      .describe(
        "Reply to all original recipients (To + Cc) instead of just the sender. Defaults to false.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to reply from instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit to reply as yourself.",
      )
      .optional(),
  })
  .strict();

// Graph's POST /reply and /replyAll return 202 with no body, so there is
// nothing to echo back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "replyToMessage",
  title: "Reply To Message",
  description:
    "Reply to a message and send immediately, quoting the original. Set replyAll to reply to all original recipients (To + Cc). Returns only a success flag (202 accepted, no id). Resolve the message id via listMessages first; to draft a reply for review instead, use createReplyDraft.",
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
    const action = input.replyAll ? "replyAll" : "reply";
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
      input.messageId,
    )}/${action}`;
    await outlookFetch(ctx.fetch, "replyToMessage", url, {
      method: "POST",
      body: JSON.stringify(
        input.comment !== undefined ? { comment: input.comment } : {},
      ),
    });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
