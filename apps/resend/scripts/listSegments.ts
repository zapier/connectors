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
        "Number of segments to retrieve (1–100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
      name: z.string(),
      created_at: z.string().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listSegments",
  title: "List Segments",
  description:
    "List the account's segments — the segment_id resolver for membership and filtering tools.",
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
    const url = new URL(`${RESEND_API_BASE}/segments`);
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
      "Resend listSegments",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
