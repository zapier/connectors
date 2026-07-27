#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { RESEND_API_BASE, resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    segment_id: z.string().describe("Segment id. Resolve via listSegments."),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Number of contacts to retrieve (1–100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
      email: z.string(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
      unsubscribed: z.boolean().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listSegmentContacts",
  title: "List Segment Contacts",
  description:
    "List the contacts belonging to a segment. GET /contacts does not support segment filtering — segment_id is a path parameter on this dedicated endpoint, not a query filter.",
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
    const url = new URL(
      `${RESEND_API_BASE}/segments/${encodeURIComponent(input.segment_id)}/contacts`,
    );
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
      "Resend listSegmentContacts",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
