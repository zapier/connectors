#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    history_item_id: z.string().describe("History item ID from listHistory."),
  })
  .strict();
const outputSchema = z
  .object({
    history_item_id: z
      .string()
      .describe(
        "ID for downloadHistoryAudio / getHistoryItem / deleteHistoryItem.",
      ),
    request_id: z.string().nullable().optional(),
    voice_id: z.string().nullable().optional(),
    voice_name: z.string().nullable().optional(),
    model_id: z.string().nullable().optional(),
    text: z
      .string()
      .nullable()
      .describe("The source text the audio was generated from.")
      .optional(),
    date_unix: z
      .number()
      .int()
      .nullable()
      .describe("Unix timestamp (seconds) of the generation.")
      .optional(),
    content_type: z
      .string()
      .nullable()
      .describe("MIME type of the stored audio, e.g. audio/mpeg.")
      .optional(),
    state: z
      .string()
      .nullable()
      .describe("Current state of the history item.")
      .optional(),
    source: z
      .string()
      .nullable()
      .describe('Generation source, such as "TTS" or "STS".')
      .optional(),
    character_count_change_from: z
      .number()
      .int()
      .nullable()
      .describe("The API's character_count_change_from value.")
      .optional(),
    character_count_change_to: z
      .number()
      .int()
      .nullable()
      .describe("The API's character_count_change_to value.")
      .optional(),
  })
  .describe("One previously generated audio item.");

const definition = defineTool({
  name: "getHistoryItem",
  title: "Get History Item",
  description:
    "Get one generation-history item's metadata by history_item_id from listHistory.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/history/${encodeURIComponent(input.history_item_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs getHistoryItem");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
