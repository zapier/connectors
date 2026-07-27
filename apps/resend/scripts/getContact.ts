#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ id: z.string().describe("Contact id or email address.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("contact"),
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  unsubscribed: z.boolean().nullable().optional(),
  properties: z
    .record(z.string(), z.json())
    .nullable()
    .describe("Custom property values keyed by property key.")
    .optional(),
});

const definition = defineTool({
  name: "getContact",
  title: "Get Contact",
  description:
    "Retrieve a single contact by contact id OR email address (the path accepts either).",
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
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "GET" },
      "Resend getContact",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
