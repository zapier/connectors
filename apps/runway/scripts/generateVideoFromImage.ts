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
    promptImage: z
      .string()
      .describe(
        "HTTPS URL (<=16 MB) or data URI (image/*, <=5 MB) of the starting image to animate.",
      ),
    promptText: z
      .string()
      .max(1000)
      .describe("Describe the motion or transformation. Required for gen4.5.")
      .optional(),
    model: z
      .string()
      .describe(
        "Video model. Required — no default; the caller chooses. Recommended: gen4_turbo, gen4.5, veo3.1, veo3.1_fast, veo3. New Runway models work here without a connector update.",
      ),
    ratio: z
      .string()
      .describe(
        "Output resolution as WIDTH:HEIGHT (model-specific). Defaults to the source image ratio if omitted.",
      )
      .optional(),
    duration: z
      .number()
      .int()
      .describe(
        "Video length in seconds. gen4 accepts 2-10; veo models accept only 4, 6, or 8.",
      )
      .optional(),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe(
        "Fix for reproducible output; same seed and inputs yield similar videos.",
      )
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
  name: "generateVideoFromImage",
  title: "Generate Video From Image",
  description:
    "Generate a video that animates a source image, guided by a motion prompt. Asynchronous: returns a task id (poll getTask for the finished video URL), or set wait: true to block until it finishes.",
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
      "/image_to_video",
      rest,
      wait,
      "Runway generateVideoFromImage",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
