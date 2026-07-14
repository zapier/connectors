#!/usr/bin/env node
// Authored by the implementation agent: Runway's product_ad recipe wraps each
// image input in a { uri } object, so run() maps the flat productImages /
// styleImages URI arrays to arrays of { uri } (codegen scaffolds the flat
// pass-through only).
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
      .enum(["2026-06", "2026-07", "unsafe-latest"])
      .describe(
        'Recipe workflow version. Use a dated version (e.g. "2026-07") to pin behavior, or "unsafe-latest" to track the newest.',
      ),
    productImages: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(
        "1-10 product image URIs (HTTPS URLs or data URIs), ideally multiple angles of the same product.",
      ),
    styleImages: z
      .array(z.string())
      .max(4)
      .describe(
        "0-4 optional style reference image URIs defining the visual treatment (lighting, palette, mood).",
      )
      .optional(),
    productInfo: z
      .string()
      .describe(
        "Optional product description and specifications to inform creative direction.",
      )
      .optional(),
    userConcept: z
      .string()
      .describe(
        "Optional creative direction (brand voice, framing, scene, lighting, camera).",
      )
      .optional(),
    ratio: z
      .enum([
        "1280:720",
        "720:1280",
        "960:960",
        "834:1112",
        "1920:1080",
        "1080:1920",
        "1440:1440",
        "1248:1664",
      ])
      .describe("Output video resolution.")
      .optional(),
    duration: z
      .number()
      .int()
      .gte(4)
      .lte(15)
      .describe("Output video length in seconds (4-15). Defaults to 10.")
      .optional(),
    audio: z
      .boolean()
      .describe("Whether to generate audio for the video (default false).")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "generateProductAd",
  title: "Generate Product Ad",
  description:
    "Generate a cinematic product ad video from product images, optional style references, product info, and creative direction. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      productImages: input.productImages.map((uri) => ({ uri })),
    };
    if (input.styleImages !== undefined)
      body.styleImages = input.styleImages.map((uri) => ({ uri }));
    if (input.productInfo !== undefined) body.productInfo = input.productInfo;
    if (input.userConcept !== undefined) body.userConcept = input.userConcept;
    if (input.ratio !== undefined) body.ratio = input.ratio;
    if (input.duration !== undefined) body.duration = input.duration;
    if (input.audio !== undefined) body.audio = input.audio;
    return submitGeneration(
      ctx.fetch,
      "/recipes/product_ad",
      body,
      input.wait,
      "Runway generateProductAd",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
