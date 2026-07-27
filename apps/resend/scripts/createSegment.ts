#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ name: z.string().describe("The segment name.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("segment"),
  id: z.string(),
  name: z.string(),
});

const definition = defineTool({
  name: "createSegment",
  title: "Create Segment",
  description:
    "Create a named segment — a list you explicitly add contacts to via addContactToSegment.",
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
      "/segments",
      { method: "POST", body: JSON.stringify(input) },
      "Resend createSegment",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
