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
    promptText: z
      .string()
      .min(1)
      .max(1000)
      .describe("Describe the video to generate."),
    model: z
      .string()
      .describe(
        "Video model. Required — no default; the caller chooses. Recommended: veo3.1, veo3.1_fast, veo3, gen4.5. New Runway models work here without a connector update.",
      ),
    ratio: z
      .string()
      .describe("Output resolution as WIDTH:HEIGHT (model-specific).")
      .optional(),
    duration: z
      .number()
      .int()
      .describe(
        "Video length in seconds. veo models accept 4, 6, or 8; gen4.5 accepts 2-10.",
      )
      .optional(),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe("Fix for reproducible output.")
      .optional(),
    contentModeration: z
      .object({
        publicFigureThreshold: z
          .enum(["auto", "low"])
          .describe(
            'How strict to be about recognizable public figures. "auto" (default) or "low" (less strict).',
          )
          .optional(),
      })
      .strict()
      .describe("Content-moderation controls for public-figure handling.")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "generateVideoFromText",
  title: "Generate Video From Text",
  description:
    "Generate a video from a text prompt alone, with no source image. Asynchronous: returns a task id (poll getTask for the finished video URL), or set wait: true to block until it finishes.",
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
      "/text_to_video",
      rest,
      wait,
      "Runway generateVideoFromText",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
