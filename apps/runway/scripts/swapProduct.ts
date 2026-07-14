#!/usr/bin/env node
// Authored by the implementation agent: Runway's product_swap recipe wraps the
// video and original-product image inputs in { uri } objects, so run() re-wraps
// the two flat *Uri inputs (newProductImages already carries { uri, view } item
// shape and passes through unchanged; codegen scaffolds the flat pass-through).
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
    referenceVideoUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the reference video containing the product to swap.",
      ),
    originalProductImageUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the original product being swapped out.",
      ),
    newProductImages: z
      .array(
        z
          .object({
            uri: z
              .string()
              .describe(
                "HTTPS URL or data URI of a new-product reference image.",
              ),
            view: z
              .enum(["front", "side", "back"])
              .describe(
                "Optional view label (front, side, or back). Omit for a single reference sheet.",
              )
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10)
      .describe(
        "1-10 reference images of the new product; supply multiple angles when the video shows several.",
      ),
    duration: z
      .number()
      .int()
      .gte(4)
      .lte(15)
      .describe("Output video length in seconds (4-15). Defaults to 10.")
      .optional(),
    resolution: z
      .enum(["720p", "1080p"])
      .describe("Output video resolution. Defaults to 720p.")
      .optional(),
    audio: z
      .boolean()
      .describe("Whether to generate audio for the video (default true).")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "swapProduct",
  title: "Swap Product",
  description:
    "Replace the product in a reference video with a new product, preserving camera motion, lighting, and scene composition. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      referenceVideo: { uri: input.referenceVideoUri },
      originalProductImage: { uri: input.originalProductImageUri },
      newProductImages: input.newProductImages,
    };
    if (input.duration !== undefined) body.duration = input.duration;
    if (input.resolution !== undefined) body.resolution = input.resolution;
    if (input.audio !== undefined) body.audio = input.audio;
    return submitGeneration(
      ctx.fetch,
      "/recipes/product_swap",
      body,
      input.wait,
      "Runway swapProduct",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
