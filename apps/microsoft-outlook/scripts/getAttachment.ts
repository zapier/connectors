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
import { attachmentSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Message id from listMessages or another message tool. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    attachmentId: z.string().describe("Attachment id from listAttachments."),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read from instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = attachmentSchema;

const definition = defineTool({
  name: "getAttachment",
  title: "Get Attachment",
  description:
    "Retrieve one attachment by id, including its base64 contentBytes. Resolve the attachmentId via listAttachments first. contentBytes is present only for file attachments — item and reference attachments carry no inline bytes.",
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
    const url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/messages/${encodeURIComponent(
      input.messageId,
    )}/attachments/${encodeURIComponent(input.attachmentId)}`;
    const res = await outlookFetch(ctx.fetch, "getAttachment", url);
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
