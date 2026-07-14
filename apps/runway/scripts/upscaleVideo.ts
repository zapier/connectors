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
    videoUri: z
      .string()
      .describe(
        "HTTPS URL (<=32 MB) or data URI (video/*, <=16 MB) of the video to upscale.",
      ),
    model: z
      .string()
      .describe(
        "Video upscaling model. Default magnific_video_upscaler_creative.",
      )
      .default("magnific_video_upscaler_creative"),
    resolution: z
      .enum(["720p", "1k", "2k", "4k"])
      .describe("Target output resolution.")
      .optional(),
    creativity: z
      .number()
      .int()
      .gte(0)
      .lte(100)
      .describe("How much the upscaler may reinterpret detail (0-100).")
      .optional(),
    sharpen: z
      .number()
      .int()
      .gte(0)
      .lte(100)
      .describe("Sharpening amount (0-100).")
      .optional(),
    smartGrain: z
      .number()
      .int()
      .gte(0)
      .lte(100)
      .describe("Film-grain amount (0-100).")
      .optional(),
    flavor: z
      .enum(["vivid", "natural"])
      .describe("Overall look of the upscaled video.")
      .optional(),
    fpsBoost: z
      .boolean()
      .describe("Interpolate to a higher frame rate.")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "upscaleVideo",
  title: "Upscale Video",
  description:
    "Upscale a video to a higher resolution. Asynchronous: returns a task id (poll getTask for the finished video URL), or set wait: true to block until it finishes.",
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
      "/video_upscale",
      rest,
      wait,
      "Runway upscaleVideo",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
