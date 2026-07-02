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
import { attachmentSchema, normalizeAttachment } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Opaque message id from listMessages or getMessage. Case-sensitive. With ImmutableId (sent on every request), ids stay stable across folder moves on M365 and Exchange Online work or school mailboxes; on consumer Outlook.com accounts Graph may ignore ImmutableId and ids can still change. Always use the id returned by moveMessage for follow-up calls.",
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
    return normalizeAttachment(
      await parseGraphResponse<Record<string, unknown>>(res),
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
