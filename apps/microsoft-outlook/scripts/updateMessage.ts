#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, mailboxRoot, outlookFetch } from "../lib/graph.ts";
import {
  dateTimeTimeZoneInputSchema,
  followupFlagSchema,
} from "../lib/schemas.ts";

const inputSchema = z
  .object({
    messageId: z
      .string()
      .describe(
        "Message id from listMessages or another message tool. Opaque and case-sensitive; changes when the message is moved between folders.",
      ),
    isRead: z
      .boolean()
      .describe("Mark the message read (true) or unread (false).")
      .optional(),
    importance: z
      .enum(["low", "normal", "high"])
      .describe("Importance level.")
      .optional(),
    categories: z
      .array(z.string())
      .describe(
        "Category names to assign. REPLACES the existing set — read the current categories via getMessage and include them if you want to append rather than overwrite.",
      )
      .optional(),
    flag: z
      .strictObject({
        flagStatus: z
          .enum(["notFlagged", "flagged", "complete"])
          .describe("Follow-up flag state."),
        startDateTime: dateTimeTimeZoneInputSchema.optional(),
        dueDateTime: dateTimeTimeZoneInputSchema.optional(),
      })
      .describe("Follow-up flag to set on the message.")
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to update instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  subject: z.string(),
  isRead: z.boolean(),
  importance: z.string().optional(),
  categories: z.array(z.string()).optional(),
  flag: followupFlagSchema.optional(),
});

const definition = defineTool({
  name: "updateMessage",
  title: "Update Message",
  description:
    "Update a message's state — mark read/unread, change importance, replace its categories, or set a follow-up flag. Set only the fields you want to change; everything else is left untouched. Resolve the message id via listMessages first. Subject/body are editable only on drafts.",
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
    const body: Record<string, unknown> = {};
    if (input.isRead !== undefined) body.isRead = input.isRead;
    if (input.importance !== undefined) body.importance = input.importance;
    if (input.categories !== undefined) body.categories = input.categories;
    if (input.flag !== undefined) body.flag = input.flag;
    const res = await outlookFetch(ctx.fetch, "updateMessage", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
