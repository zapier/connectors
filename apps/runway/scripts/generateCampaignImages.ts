#!/usr/bin/env node
// Authored by the implementation agent: Runway's recipe endpoints wrap asset
// inputs in { uri } objects, so run() re-wraps the flat productImageUri into
// { image: { uri } } (codegen scaffolds the flat pass-through only).
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
    productImageUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the product image to preserve across the campaign images.",
      ),
    prompt: z
      .string()
      .describe(
        'Style / creative brief for the fashion campaign, e.g. "High-key fashion editorial".',
      ),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "generateCampaignImages",
  title: "Generate Campaign Images",
  description:
    "Generate four fashion campaign images from a product image and a style brief. Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
      image: { uri: input.productImageUri },
      prompt: input.prompt,
    };
    return submitGeneration(
      ctx.fetch,
      "/recipes/product_campaign_image",
      body,
      input.wait,
      "Runway generateCampaignImages",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
