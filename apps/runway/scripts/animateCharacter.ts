#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds a flat body, but
// Runway's character_performance endpoint takes a nested body — { character:
// { type, uri }, reference: { type: "video", uri } } — so run() assembles the
// nested shape (and injects the constant reference type) from the flat,
// agent-friendly inputs.
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
    characterUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the character to animate. A recognizable face must be visible.",
      ),
    characterType: z
      .enum(["image", "video"])
      .describe("Whether characterUri points to an image or a video.")
      .default("image"),
    referenceVideoUri: z
      .string()
      .describe(
        "HTTPS URL (<=32 MB) or data URI of the driving performance video. Must be 3-30 seconds (outside that range fails with ASSET.INVALID).",
      ),
    model: z
      .string()
      .describe("Character-performance model. Default act_two.")
      .default("act_two"),
    ratio: z
      .enum([
        "1280:720",
        "720:1280",
        "960:960",
        "1104:832",
        "832:1104",
        "1584:672",
      ])
      .describe("Output resolution.")
      .optional(),
    bodyControl: z
      .boolean()
      .describe(
        "Apply non-facial movement and gestures to the character (default true).",
      )
      .optional(),
    expressionIntensity: z
      .number()
      .int()
      .gte(1)
      .lte(5)
      .describe(
        "Intensity of the character's facial expression, 1-5 (default 3).",
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
  name: "animateCharacter",
  title: "Animate Character",
  description:
    "Animate a character (image or video) by transferring a performance from a driving video (Runway Act-Two). Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      character: { type: input.characterType, uri: input.characterUri },
      reference: { type: "video", uri: input.referenceVideoUri },
      model: input.model,
    };
    if (input.ratio !== undefined) body.ratio = input.ratio;
    if (input.bodyControl !== undefined) body.bodyControl = input.bodyControl;
    if (input.expressionIntensity !== undefined)
      body.expressionIntensity = input.expressionIntensity;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.contentModeration !== undefined)
      body.contentModeration = input.contentModeration;
    return submitGeneration(
      ctx.fetch,
      "/character_performance",
      body,
      input.wait,
      "Runway animateCharacter",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
