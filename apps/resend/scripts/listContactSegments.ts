#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ contact_id: z.string().describe("Contact id or email address.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  has_more: z.boolean().nullable().optional(),
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      created_at: z.string().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listContactSegments",
  title: "List Contact Segments",
  description:
    "List the segments a contact belongs to, by contact id or email address.",
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
      `/contacts/${encodeURIComponent(input.contact_id)}/segments`,
      { method: "GET" },
      "Resend listContactSegments",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
