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
import { messageSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Opaque message id from listMessages or getMessage. Case-sensitive. With ImmutableId (sent on every request), ids stay stable across folder moves on M365 and Exchange Online work or school mailboxes; on consumer Outlook.com accounts Graph may ignore ImmutableId and ids can still change. Always use the id returned by moveMessage for follow-up calls.",
      ),
    bodyContentType: z
      .enum(["text", "html"])
      .describe(
        "Format for the returned body. Defaults to text (smaller, keeps visible URLs); pass html to preserve formatting.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read from instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = messageSchema;

const definition = defineTool({
  name: "getMessage",
  title: "Get Message",
  description:
    "Retrieve a single message by id, including its full body, recipient lists, flag, and categories. Resolve the id via listMessages first. The body is returned as plain text by default; pass bodyContentType: html for the original markup.",
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
    )}`;
    // Body content type is a Prefer header, not a query param; default to text.
    const res = await outlookFetch(ctx.fetch, "getMessage", url, {
      headers: {
        Prefer: `outlook.body-content-type="${input.bodyContentType ?? "text"}"`,
      },
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
