#!/usr/bin/env node
// Authored by the implementation agent: Runway's product_ugc recipe wraps each
// image input in a { uri } object, so run() re-wraps the flat characterImageUri
// and productImageUri (codegen scaffolds the flat pass-through only).
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
    characterImageUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the on-camera character image. Aspect ratio (width/height) must be 0.4-4.",
      ),
    productImageUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the product image. Aspect ratio (width/height) must be 0.4-4.",
      ),
    productInfo: z
      .string()
      .describe(
        "Product details and creative brief — what the product is and its key benefits.",
      )
      .optional(),
    userConcept: z
      .string()
      .describe(
        "Optional creative direction for the UGC video (tone, voice register, message, or full script).",
      )
      .optional(),
    duration: z
      .number()
      .int()
      .gte(4)
      .lte(15)
      .describe("Output video length in seconds (4-15). Defaults to 15.")
      .optional(),
    ratio: z
      .enum(["720:1280", "1080:1920"])
      .describe("Output video resolution (vertical).")
      .optional(),
    audio: z
      .boolean()
      .describe("Whether to generate audio for the video (default true).")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "generateProductUgc",
  title: "Generate Product UGC",
  description:
    "Generate a vertical user-generated-content (UGC) ad video from a character image, product image, product details, and optional creative direction. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      characterImage: { uri: input.characterImageUri },
      productImage: { uri: input.productImageUri },
    };
    if (input.productInfo !== undefined) body.productInfo = input.productInfo;
    if (input.userConcept !== undefined) body.userConcept = input.userConcept;
    if (input.duration !== undefined) body.duration = input.duration;
    if (input.ratio !== undefined) body.ratio = input.ratio;
    if (input.audio !== undefined) body.audio = input.audio;
    return submitGeneration(
      ctx.fetch,
      "/recipes/product_ugc",
      body,
      input.wait,
      "Runway generateProductUgc",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
