#!/usr/bin/env node
// Authored by the implementation agent: Runway's recipe endpoints wrap asset
// inputs in { uri } objects, so run() re-wraps the flat brandLogoImageUri into
// { referenceImage: { uri } } (codegen scaffolds the flat pass-through only).
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
    prompt: z
      .string()
      .describe(
        "Marketing image brief. Describe the subject, audience, channel, mood, setting, and any constraints.",
      ),
    brandLogoImageUri: z
      .string()
      .describe(
        "Optional HTTPS URL or data URI of a brand logo image to guide the generated marketing image.",
      )
      .optional(),
    outputCount: z
      .number()
      .int()
      .gte(1)
      .lte(4)
      .describe(
        "Number of images to generate (1-4). Defaults to 4; more images cost more credits.",
      )
      .default(4),
    quality: z
      .enum(["low", "medium", "high"])
      .describe(
        'Rendering quality. Lower is faster and cheaper; "high" (default) is slowest and best.',
      )
      .default("high"),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "generateMarketingImage",
  title: "Generate Marketing Image",
  description:
    "Generate a polished marketing stock image from a text brief and an optional brand logo. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      prompt: input.prompt,
      outputCount: input.outputCount,
      quality: input.quality,
    };
    if (input.brandLogoImageUri !== undefined)
      body.referenceImage = { uri: input.brandLogoImageUri };
    return submitGeneration(
      ctx.fetch,
      "/recipes/marketing_stock_image",
      body,
      input.wait,
      "Runway generateMarketingImage",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
