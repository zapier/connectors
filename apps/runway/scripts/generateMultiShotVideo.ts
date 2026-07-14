#!/usr/bin/env node
// Authored by the implementation agent: Runway's multi_shot_video recipe takes
// a mode-discriminated body (auto → prompt; custom → shots[]) and wraps the
// first-frame asset in { firstFrame: { uri } }, so run() assembles the correct
// variant and re-wraps the flat firstFrameUri (codegen scaffolds neither).
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
    version: z
      .enum(["2026-06", "unsafe-latest"])
      .describe(
        'Recipe workflow version. Use a dated version (e.g. "2026-06") to pin behavior, or "unsafe-latest" to track the newest.',
      ),
    mode: z
      .enum(["auto", "custom"])
      .describe(
        '"auto" decomposes a story prompt into 5 shots (provide prompt); "custom" polishes a 3-5 shot list you provide (provide shots).',
      ),
    prompt: z
      .string()
      .describe("Story prompt. Required in auto mode.")
      .optional(),
    shots: z
      .array(
        z
          .object({
            prompt: z.string().describe("What happens in this shot."),
            duration: z
              .number()
              .describe(
                "Shot length in seconds. Per-shot durations must sum to the total duration.",
              ),
          })
          .strict(),
      )
      .min(3)
      .max(5)
      .describe("Shot list of 3-5 shots. Required in custom mode.")
      .optional(),
    firstFrameUri: z
      .string()
      .describe(
        "Optional HTTPS URL or data URI of an image to use as the video's first frame.",
      )
      .optional(),
    ratio: z
      .enum([
        "1280:720",
        "720:1280",
        "960:960",
        "1920:1080",
        "1080:1920",
        "1440:1440",
      ])
      .describe("Output dimensions as WIDTH:HEIGHT.")
      .optional(),
    duration: z
      .union([z.literal(5), z.literal(10), z.literal(15)])
      .describe("Total output duration in seconds. Defaults to 10.")
      .optional(),
    audio: z
      .boolean()
      .describe("Whether to generate audio for the video (default true).")
      .optional(),
    wait: waitInputField,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.mode === "auto" && val.prompt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prompt is required when mode is 'auto'.",
        path: ["prompt"],
      });
    }
    if (val.mode === "custom" && val.shots === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "shots is required when mode is 'custom'.",
        path: ["shots"],
      });
    }
  });

const definition = defineTool({
  name: "generateMultiShotVideo",
  title: "Generate Multi Shot Video",
  description:
    "Generate a multi-cut video from a story prompt (auto mode) or a custom 3-5 shot list (custom mode). Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
    const body: Record<string, unknown> = {
      version: input.version,
      mode: input.mode,
    };
    if (input.mode === "auto") body.prompt = input.prompt;
    else body.shots = input.shots;
    if (input.firstFrameUri !== undefined)
      body.firstFrame = { uri: input.firstFrameUri };
    if (input.ratio !== undefined) body.ratio = input.ratio;
    if (input.duration !== undefined) body.duration = input.duration;
    if (input.audio !== undefined) body.audio = input.audio;
    return submitGeneration(
      ctx.fetch,
      "/recipes/multi_shot_video",
      body,
      input.wait,
      "Runway generateMultiShotVideo",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
