#!/usr/bin/env node
// Binary audio endpoint: returns raw audio bytes.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  generatedAudioFromResponse,
  GeneratedAudioSchema,
} from "../lib/audioOutput.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    history_item_id: z.string().describe("History item ID from listHistory."),
    return_base64: z
      .boolean()
      .default(false)
      .describe(
        "If true, return the audio inline as audio_base64 instead of writing a file and returning audio_path. Use for consumers without filesystem access (e.g. remote MCP); note the base64 payload is large. Default false (file path).",
      ),
  })
  .strict();
const outputSchema = GeneratedAudioSchema;

const definition = defineTool({
  name: "downloadHistoryAudio",
  title: "Download History Audio",
  description:
    "Retrieve the audio of a previously generated item by history_item_id. Free — re-fetching from history spends no new credits, unlike re-generating.",
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
    const res = await ctx.fetch(
      `https://api.elevenlabs.io/v1/history/${encodeURIComponent(input.history_item_id)}/audio`,
      { method: "GET" },
    );
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs downloadHistoryAudio");
    const audio = await generatedAudioFromResponse(res, {
      returnBase64: input.return_base64,
      filePrefix: "history-audio",
    });
    // Stored-audio responses carry no history-item-id header; the id is the input.
    return { ...audio, history_item_id: input.history_item_id };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
