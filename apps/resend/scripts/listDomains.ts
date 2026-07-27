#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  object: z.literal("list"),
  has_more: z.boolean().nullable().optional(),
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().describe("The domain name, e.g. acme.com."),
      status: z
        .string()
        .describe(
          "Verification status, e.g. verified, pending, not_started, failed.",
        ),
      created_at: z.string().nullable().optional(),
      region: z
        .string()
        .nullable()
        .describe("AWS region the domain sends from, e.g. us-east-1.")
        .optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listDomains",
  title: "List Domains",
  description:
    "List the account's sending domains and their verification status. Use to diagnose a domain-not-verified send failure by reporting which domains are verified.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (_input, ctx) => {
    const res = await resendFetch(
      ctx.fetch,
      "/domains",
      { method: "GET" },
      "Resend listDomains",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
