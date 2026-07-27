#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    segment_id: z
      .string()
      .describe("The segment to send to. Resolve via listSegments."),
    from: z.string().describe(
      "Sender address, e.g. Acme <hello@acme.com>. Use a domain verified in Resend for production sends.", // pii:allow -- example address, not real PII
    ),
    subject: z.string().describe("Email subject line."),
    reply_to: z.array(z.string()).describe("Reply-to address(es).").optional(),
    html: z
      .string()
      .describe("HTML body — standard HTML. Provide html and/or text.")
      .optional(),
    text: z
      .string()
      .describe("Plain-text body. Auto-derived from html if omitted.")
      .optional(),
    name: z
      .string()
      .describe(
        "Internal friendly name for the broadcast (not shown to recipients).",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("The broadcast's id — pass to sendBroadcast."),
});

const definition = defineTool({
  name: "createBroadcast",
  title: "Create Broadcast",
  description:
    "Draft a broadcast — one email to every contact in a segment. Does not send until you call sendBroadcast. Use a verified sending domain for the from address in production.",
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
      "/broadcasts",
      { method: "POST", body: JSON.stringify(input) },
      "Resend createBroadcast",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
