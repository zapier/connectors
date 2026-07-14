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
        "HTTPS URL (<=32 MB) or data URI (video/*, <=16 MB) of the video to edit.",
      ),
    promptText: z
      .string()
      .max(1000)
      .describe("Describe the edit or restyle to apply.")
      .optional(),
    model: z
      .string()
      .describe(
        "Video-editing model. Required — no default; the caller chooses. Recommended: aleph2, gemini_omni_flash, seedance2. New Runway models work here without a connector update.",
      ),
    ratio: z.string().describe("Output resolution as WIDTH:HEIGHT.").optional(),
    targetAspectRatio: z
      .enum(["16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "21:9"])
      .describe("Aspect ratio to reframe the output to.")
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
  name: "editVideo",
  title: "Edit Video",
  description:
    "Transform or restyle an existing video with a text prompt. Asynchronous: returns a task id (poll getTask for the finished video URL), or set wait: true to block until it finishes.",
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
      "/video_to_video",
      rest,
      wait,
      "Runway editVideo",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
