#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z
  .object({
    object: z.string().nullable().describe('Object type ("list").').optional(),
    data: z
      .array(
        z
          .object({
            id: z
              .string()
              .describe(
                'The model id, in provider/model form (e.g. "perplexity/sonar", "openai/gpt-5"). Pass this to createAgent\'s model field.',
              ),
            object: z
              .string()
              .nullable()
              .describe('Object type ("model").')
              .optional(),
          })
          .describe("An available model."),
      )
      .describe("The available models."),
  })
  .describe("The available models.");

const definition = defineTool({
  name: "listModels",
  title: "List Models",
  description:
    "List the model ids usable with createAgent — Perplexity's own models (including deep-research), plus third-party models. Call this to discover a model id before setting createAgent's model field.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "perplexity",
  run: async (_input, ctx) => {
    const url = `https://api.perplexity.ai/v1/models`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Perplexity listModels");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
