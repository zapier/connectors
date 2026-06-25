#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, mailboxRoot, outlookFetch } from "../lib/graph.ts";
import { recipientInputSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Id of the message to forward, from listMessages or getMessage. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    toRecipients: z
      .array(recipientInputSchema)
      .min(1)
      .describe(
        'Who to forward the message to, e.g. [{ "emailAddress": { "address": "jane@contoso.com" } }].',
      ),
    comment: z
      .string()
      .describe(
        "Note prepended above the forwarded original. Plain text or HTML.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to forward from instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit to forward as yourself.",
      )
      .optional(),
  })
  .strict();

// Graph's POST /forward returns 202 with no body, so there is nothing to echo
// back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "forwardMessage",
  title: "Forward Message",
  description:
    "Forward a message to new recipients and send immediately, quoting the original. Returns only a success flag (202 accepted, no id). Resolve the message id via listMessages first.",
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
    )}/forward`;
    const body = {
      toRecipients: input.toRecipients,
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    };
    await outlookFetch(ctx.fetch, "forwardMessage", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
