#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    voice_id: z
      .string()
      .describe(
        "Voice id from listVoices, designVoice, or the voice_clone_id from cloneVoice.",
      ),
  })
  .strict();
const outputSchema = z.object({
  voice_id: z.string(),
  name: z.string(),
  language: z.string(),
  gender: z.string(),
  type: z.enum(["public", "private"]),
  preview_audio_url: z.union([z.string(), z.null()]).optional(),
  support_pause: z
    .boolean()
    .nullable()
    .describe("Whether the voice honors SSML pause/break tags.")
    .optional(),
  support_locale: z
    .boolean()
    .nullable()
    .describe("Whether the voice supports locale variants.")
    .optional(),
});

const definition = defineTool({
  name: "getVoice",
  title: "Get Voice",
  description:
    "Get one voice's details (name, language, engine compatibility, and clone/training status) by id. Poll it to check a cloned voice's readiness before using it.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/voices/${encodeURIComponent(input.voice_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getVoice");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
