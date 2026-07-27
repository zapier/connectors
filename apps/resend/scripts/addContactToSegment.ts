#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    contact_id: z.string().describe("Contact id or email address."),
    segment_id: z.string().describe("Segment id, from listSegments."),
  })
  .strict();
const outputSchema = z.object({ id: z.string() });

const definition = defineTool({
  name: "addContactToSegment",
  title: "Add Contact To Segment",
  description:
    "Add an existing contact to a segment. contact_id accepts a contact id or email; resolve segment_id via listSegments.",
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
      `/contacts/${encodeURIComponent(input.contact_id)}/segments/${encodeURIComponent(input.segment_id)}`,
      { method: "POST" },
      "Resend addContactToSegment",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
