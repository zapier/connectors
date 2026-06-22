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
        "Draft id from createDraft. Opaque and case-sensitive; the id is dead once the draft is sent.",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) the draft lives in instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

// Graph's POST /messages/{id}/send returns 202 with no body, so there is
// nothing to echo back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "sendDraft",
  title: "Send Draft",
  description:
    "Send a draft email created by createDraft. Returns only a success flag (the send is accepted asynchronously, and 202 ≠ delivered); the draft id is dead after sending. Resolve the draft id from createDraft first.",
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
    )}/send`;
    await outlookFetch(ctx.fetch, "sendDraft", url, { method: "POST" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
