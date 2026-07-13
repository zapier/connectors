#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Items per page, max 1000. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    start_after_history_item_id: z
      .string()
      .describe("Cursor — the last_history_item_id from the previous page.")
      .optional(),
    voice_id: z
      .string()
      .describe("Only items generated with this voice.")
      .optional(),
    model_id: z
      .string()
      .describe("Only items generated with this model. Also provide source.")
      .optional(),
    search: z
      .string()
      .describe("Search term used to filter history items.")
      .optional(),
    source: z
      .enum(["TTS", "STS"])
      .describe("Only items from text to speech (TTS) or voice changer (STS).")
      .optional(),
    date_after_unix: z
      .number()
      .int()
      .describe("Only items created at or after this Unix timestamp (seconds).")
      .optional(),
    date_before_unix: z
      .number()
      .int()
      .describe("Only items created before this Unix timestamp (seconds).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  history: z.array(
    z
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
      .describe("One previously generated audio item."),
  ),
  has_more: z.boolean().describe("True when another page exists."),
  last_history_item_id: z
    .string()
    .nullable()
    .describe("Cursor — pass as start_after_history_item_id to page on.")
    .optional(),
});

const definition = defineTool({
  name: "listHistory",
  title: "List History",
  description:
    "List generated-audio history with item IDs, source text, voice, model, and timestamps. Filter by voice, model, date, source, or free-text search.",
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
    const url = new URL(`https://api.elevenlabs.io/v1/history`);
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.start_after_history_item_id !== undefined) {
      url.searchParams.set(
        "start_after_history_item_id",
        String(input.start_after_history_item_id),
      );
    }
    if (input.voice_id !== undefined) {
      url.searchParams.set("voice_id", String(input.voice_id));
    }
    if (input.model_id !== undefined) {
      url.searchParams.set("model_id", String(input.model_id));
    }
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    if (input.source !== undefined) {
      url.searchParams.set("source", String(input.source));
    }
    if (input.date_after_unix !== undefined) {
      url.searchParams.set("date_after_unix", String(input.date_after_unix));
    }
    if (input.date_before_unix !== undefined) {
      url.searchParams.set("date_before_unix", String(input.date_before_unix));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs listHistory");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
