#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ id: z.string().describe("Segment id.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("segment"),
  id: z.string(),
  deleted: z.boolean(),
});

const definition = defineTool({
  name: "deleteSegment",
  title: "Delete Segment",
  description:
    "Delete a segment (the membership grouping) — a separate operation from deleteContact, which removes the contact itself.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const res = await resendFetch(
      ctx.fetch,
      `/segments/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
      "Resend deleteSegment",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
