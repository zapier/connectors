#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  generationResultSchema,
  submitGeneration,
  waitInputField,
} from "../lib/runway.ts";

const inputSchema = z
  .object({
    imageUri: z
      .string()
      .describe(
        "HTTPS URL (<=16 MB) or data URI (image/*, <=5 MB) of the image to upscale.",
      ),
    model: z
      .string()
      .describe(
        "Image upscaling model. Default magnific_precision_upscaler_v2.",
      )
      .default("magnific_precision_upscaler_v2"),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe("Fix for reproducible output.")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "upscaleImage",
  title: "Upscale Image",
  description:
    "Upscale an image to a higher resolution. Asynchronous: returns a task id (poll getTask for the finished image URL), or set wait: true to block until it finishes.",
  inputSchema,
  outputSchema: generationResultSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (input, ctx) => {
    const { wait, ...rest } = input;
    return submitGeneration(
      ctx.fetch,
      "/image_upscale",
      rest,
      wait,
      "Runway upscaleImage",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
