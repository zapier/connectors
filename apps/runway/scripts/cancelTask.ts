#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { runwayFetch } from "../lib/runwayFetch.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe("The task id to cancel (if running) or delete (if finished)."),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .describe(
      "The task id that was cancelled (if running) or deleted (if already terminal).",
    ),
  cancelled: z
    .literal(true)
    .describe(
      "Always true on success; the DELETE returns 204 No Content and the connector synthesizes this confirmation.",
    ),
});

const definition = defineTool({
  name: "cancelTask",
  title: "Cancel Task",
  description:
    "Cancel a running or pending task, or delete a completed one, by id. Returns a small confirmation (the API responds 204 No Content).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (input, ctx) => {
    await runwayFetch(
      ctx.fetch,
      `/tasks/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
      "Runway cancelTask",
    );
    return { id: input.id, cancelled: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
