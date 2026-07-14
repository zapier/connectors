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
      .describe("What to generate. Up to 1000 characters."),
    ratio: z
      .string()
      .describe(
        "Output resolution as WIDTH:HEIGHT, e.g. 1920:1080, 1024:1024, 1080:1920. Allowed values are model-specific.",
      ),
    model: z
      .string()
      .describe(
        "Image model to use. Required — no default; the caller chooses. Recommended: gen4_image, gen4_image_turbo (faster), gpt_image_2, gemini_image3_pro, gemini_2.5_flash. New Runway models work here without a connector update.",
      ),
    referenceImages: z
      .array(
        z
          .object({
            uri: z
              .string()
              .describe(
                "HTTPS URL (<=16 MB) or data URI (image/*, <=5 MB) of the reference image.",
              ),
            tag: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9_]+$"))
              .min(3)
              .max(16)
              .describe(
                "Optional 3-16 char lowercase name used to refer to this image inside promptText.",
              )
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(3)
      .describe(
        "1-3 reference images to guide generation (required for gen4_image_turbo; optional otherwise).",
      )
      .optional(),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe(
        "Fix for reproducible output; same seed and inputs yield similar images.",
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
  name: "generateImage",
  title: "Generate Image",
  description:
    "Generate an image from a text prompt, optionally guided by 1-3 reference images. Asynchronous: returns a task id (poll getTask for the finished image URL), or set wait: true to block until it finishes.",
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
      "/text_to_image",
      rest,
      wait,
      "Runway generateImage",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
