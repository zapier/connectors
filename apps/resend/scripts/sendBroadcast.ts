#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    broadcast_id: z.string().describe("The broadcast id from createBroadcast."),
    scheduled_at: z
      .string()
      .describe(
        "ISO 8601 time to send later, e.g. 2026-08-05T11:52:01Z. Omit to send immediately.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({ id: z.string().describe("The broadcast id.") });

const definition = defineTool({
  name: "sendBroadcast",
  title: "Send Broadcast",
  description:
    "Send (or schedule) a previously-created broadcast to its segment. Omit scheduled_at to send now.",
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
    const path = `/broadcasts/${encodeURIComponent(input.broadcast_id)}/send`;
    const body: Record<string, unknown> = {};
    if (input.scheduled_at !== undefined) {
      body["scheduled_at"] = input.scheduled_at;
    }
    const res = await resendFetch(
      ctx.fetch,
      path,
      { method: "POST", body: JSON.stringify(body) },
      "Resend sendBroadcast",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
