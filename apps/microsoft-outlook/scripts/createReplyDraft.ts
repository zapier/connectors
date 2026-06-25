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
        "Id of the message to reply to, from listMessages or getMessage. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    comment: z
      .string()
      .describe(
        "Reply text to seed the draft body, above the quoted original. Plain text or HTML.",
      )
      .optional(),
    replyAll: z
      .boolean()
      .describe(
        "Draft a reply to all original recipients (To + Cc) instead of just the sender. Defaults to false.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to draft the reply in instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z
    .string()
    .describe("Draft reply id — edit further or pass to sendDraft."),
  subject: z.string(),
  isDraft: z.boolean(),
  webLink: z.string().optional(),
});

const definition = defineTool({
  name: "createReplyDraft",
  title: "Create Reply Draft",
  description:
    "Create a draft reply (not sent), pre-populated with the original recipients and quoted body. Set replyAll to draft a reply to all original recipients (To + Cc). Returns the draft's id — review/edit it, then send with sendDraft. Resolve the message id via listMessages first; to reply and send in one step, use replyToMessage.",
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
    const action = input.replyAll ? "createReplyAll" : "createReply";
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
      input.messageId,
    )}/${action}`;
    const res = await outlookFetch(ctx.fetch, "createReplyDraft", url, {
      method: "POST",
      body: JSON.stringify(
        input.comment !== undefined ? { comment: input.comment } : {},
      ),
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
