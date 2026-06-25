#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, mailboxRoot, outlookFetch } from "../lib/graph.ts";
import {
  outgoingMessageSchema,
  toGraphOutgoingMessage,
} from "../lib/schemas.ts";

const inputSchema = z
  .object({
    message: outgoingMessageSchema.describe(
      "The email to send. subject and toRecipients are required.",
    ),
    saveToSentItems: z
      .boolean()
      .describe("Keep a copy in Sent Items. Defaults to true.")
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to send as instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit to send as yourself.",
      )
      .optional(),
  })
  .strict();

// Graph's POST /sendMail returns 202 with no body and no message id, so there
// is nothing to echo back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "sendMail",
  title: "Send Mail",
  description:
    "Compose and send an email in one step. Returns only a success flag — the send is accepted asynchronously with no message id (and 202 ≠ delivered). When you need the sent message's id, use createDraft then sendDraft instead.",
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
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/sendMail`;
    const body: Record<string, unknown> = {
      message: toGraphOutgoingMessage(input.message),
    };
    if (input.saveToSentItems !== undefined) {
      body.saveToSentItems = input.saveToSentItems;
    }
    await outlookFetch(ctx.fetch, "sendMail", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
