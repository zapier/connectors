#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ email_id: z.string().describe("The sent email's id.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("email"),
  id: z.string(),
  to: z.array(z.string()),
  from: z.string(),
  subject: z.string(),
  created_at: z.string(),
  last_event: z
    .enum([
      "bounced",
      "canceled",
      "clicked",
      "complained",
      "delivered",
      "delivery_delayed",
      "failed",
      "opened",
      "queued",
      "scheduled",
      "sent",
      "suppressed",
    ])
    .describe("The email's current delivery status."),
  html: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  bcc: z.array(z.string()).nullable().optional(),
  cc: z.array(z.string()).nullable().optional(),
  reply_to: z.array(z.string()).nullable().optional(),
  scheduled_at: z
    .string()
    .nullable()
    .describe("The scheduled send time, or null if sent immediately.")
    .optional(),
});

const definition = defineTool({
  name: "getEmail",
  title: "Get Email",
  description:
    "Retrieve a single sent email and its current delivery status (last_event). Get the id from sendEmail's output or listEmails.",
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
    const res = await resendFetch(
      ctx.fetch,
      `/emails/${encodeURIComponent(input.email_id)}`,
      { method: "GET" },
      "Resend getEmail",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
