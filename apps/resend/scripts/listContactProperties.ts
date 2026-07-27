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
        "Number of properties to retrieve (1–100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
      key: z
        .string()
        .describe("The property key to use in a contact's `properties` map."),
      type: z
        .string()
        .nullable()
        .describe("The property's data type.")
        .optional(),
      fallback_value: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listContactProperties",
  title: "List Contact Properties",
  description:
    "List the account's defined custom contact properties. Returns the valid keys and types usable in a contact's `properties` field.",
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
    const url = new URL(`${RESEND_API_BASE}/contact-properties`);
    url.searchParams.set("limit", String(input.limit ?? 20));
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
      "Resend listContactProperties",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
