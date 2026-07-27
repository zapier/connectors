#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    from: z
      .string()
      .describe(
        "Sender address on a verified domain, optionally with a display name in the form `Name <address@your-domain>`. Unverified domains return 403.",
      ),
    to: z
      .array(z.string())
      .min(1)
      .max(50)
      .describe("Recipient email addresses (max 50)."),
    subject: z.string().describe("Email subject line."),
    html: z
      .string()
      .describe(
        "HTML body — standard HTML, not Markdown. Provide html and/or text.",
      )
      .optional(),
    text: z
      .string()
      .describe("Plain-text body. Auto-derived from html if omitted.")
      .optional(),
    cc: z.array(z.string()).describe("Cc recipient addresses.").optional(),
    bcc: z.array(z.string()).describe("Bcc recipient addresses.").optional(),
    reply_to: z.array(z.string()).describe("Reply-to addresses.").optional(),
    headers: z
      .record(z.string(), z.string())
      .describe("Custom email headers as key-value pairs.")
      .optional(),
    scheduled_at: z
      .string()
      .describe(
        "ISO 8601 time to send later, e.g. 2026-08-01T09:00:00Z. Omit to send now.",
      )
      .optional(),
    tags: z
      .array(
        z
          .object({
            name: z
              .string()
              .describe(
                "Tag name. ASCII letters, numbers, underscores, or dashes; max 256 chars.",
              )
              .optional(),
            value: z
              .string()
              .describe(
                "Tag value. ASCII letters, numbers, underscores, or dashes; max 256 chars.",
              )
              .optional(),
          })
          .strict(),
      )
      .describe("Metadata tags attached to the email.")
      .optional(),
    attachments: z
      .array(
        z
          .object({
            path: z
              .string()
              .describe(
                "HTTPS URL where the attachment file is hosted; Resend fetches it server-side.",
              ),
            filename: z
              .string()
              .describe("Filename the recipient sees, e.g. invoice.pdf."),
            content_type: z
              .string()
              .describe("MIME type; derived from filename if omitted.")
              .optional(),
            content_id: z
              .string()
              .describe(
                "Content ID for embedding an inline image via a cid reference (e.g. cid:image001).",
              )
              .optional(),
          })
          .strict(),
      )
      .describe(
        "Files to attach, each hosted at a URL (path). Bytes/base64 attachments are not supported by this tool.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .describe(
      "The sent email's id — pass to getEmail to read delivery status.",
    ),
});

const definition = defineTool({
  name: "sendEmail",
  title: "Send Email",
  description:
    "Send a transactional email to one or more recipients. The sender domain must be verified in Resend (otherwise a 403), or use onboarding@resend.dev for tests to your own address.", // pii:allow -- Resend public sandbox address, not real PII
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const res = await resendFetch(
      ctx.fetch,
      "/emails",
      { method: "POST", body: JSON.stringify(input) },
      "Resend sendEmail",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
