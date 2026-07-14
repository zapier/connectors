#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { fetchTask, taskSchema } from "../lib/runway.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe("The task id returned by any generate, audio, or recipe tool."),
  })
  .strict();

const definition = defineTool({
  name: "getTask",
  title: "Get Task",
  description:
    "Get the status, progress, and finished asset URLs of a generation task by its id. Poll this after a generate/audio/recipe tool until status is SUCCEEDED (output URLs are then present) or a terminal FAILED/CANCELLED.",
  inputSchema,
  outputSchema: taskSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (input, ctx) => {
    return fetchTask(ctx.fetch, input.id, "Runway getTask");
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
