#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ id: z.string().describe("Segment id.") })
  .strict();
const outputSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getSegment",
  title: "Get Segment",
  description: "Get a single segment by id.",
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
      `/segments/${encodeURIComponent(input.id)}`,
      { method: "GET" },
      "Resend getSegment",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
