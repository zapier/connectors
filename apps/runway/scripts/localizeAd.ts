#!/usr/bin/env node
// Authored by the implementation agent: Runway's recipe endpoints wrap asset
// inputs in { uri } objects, so run() re-wraps the flat referenceImageUri into
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
    referenceImageUri: z
      .string()
      .describe("HTTPS URL or data URI of the ad image to localize."),
    targetLanguage: z
      .string()
      .describe(
        'Target language for the localized ad, e.g. "ja" (Japanese), "es" (Spanish). Common values: `ar`, `zh`, `zh-Hant`, `nl`, `en`, ... (22 total).',
      ),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "localizeAd",
  title: "Localize Ad",
  description:
    "Localize an existing ad image for a target language, preserving the visual creative while adapting on-screen messaging. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      referenceImage: { uri: input.referenceImageUri },
      targetLanguage: input.targetLanguage,
    };
    return submitGeneration(
      ctx.fetch,
      "/recipes/ad_localization",
      body,
      input.wait,
      "Runway localizeAd",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
