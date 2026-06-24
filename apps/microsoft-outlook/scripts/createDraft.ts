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
import { outgoingMessageSchema, recipientSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    ...outgoingMessageSchema.shape,
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to draft in instead of your own, e.g. team@contoso.com. Requires Send-as/Send-on-behalf delegation. Omit to draft in your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string().describe("Draft id — pass to sendDraft to send it later."),
  subject: z.string(),
  isDraft: z.boolean(),
  bodyPreview: z
    .string()
    .optional()
    .describe(
      "First ~255 chars of the body; use getMessage for the full body.",
    ),
  toRecipients: z.array(recipientSchema).optional(),
  webLink: z.string().optional(),
});

const definition = defineTool({
  name: "createDraft",
  title: "Create Draft",
  description:
    "Compose an email and save it as a draft without sending. Returns the draft's id — the id-bearing path: pair with sendDraft when you need to reference or send the message later, or leave the draft for a human to review. Use sendMail to compose and send in one step (no id returned).",
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
    const { mailbox, ...message } = input;
    const url = `${GRAPH_BASE}${mailboxRoot(mailbox)}/messages`;
    const res = await outlookFetch(ctx.fetch, "createDraft", url, {
      method: "POST",
      body: JSON.stringify(message),
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
