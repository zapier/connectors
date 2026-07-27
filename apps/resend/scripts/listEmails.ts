#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { RESEND_API_BASE, resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Number of emails to retrieve (1–100). This tool requests 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    after: z
      .string()
      .describe(
        "Pagination cursor — the id of the last item from the previous page. Cannot be combined with `before`.",
      )
      .optional(),
    before: z
      .string()
      .describe(
        "Pagination cursor for the previous page. Cannot be combined with `after`.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  has_more: z
    .boolean()
    .describe("True if more results are available; page with `after`."),
  data: z.array(
    z.object({
      id: z.string(),
      to: z
        .array(z.string())
        .nullable()
        .describe("Recipient email address(es).")
        .optional(),
      from: z.string().nullable().optional(),
      subject: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
      last_event: z
        .string()
        .nullable()
        .describe("Delivery status, e.g. delivered, bounced, sent, queued.")
        .optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listEmails",
  title: "List Emails",
  description:
    "List previously sent emails, most recent first. Use to find an email id or review recent sends.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const url = new URL(`${RESEND_API_BASE}/emails`);
    url.searchParams.set("limit", String(input.limit ?? 10));
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    if (input.before !== undefined) {
      url.searchParams.set("before", String(input.before));
    }
    const res = await resendFetch(
      ctx.fetch,
      url.toString(),
      { method: "GET" },
      "Resend listEmails",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
