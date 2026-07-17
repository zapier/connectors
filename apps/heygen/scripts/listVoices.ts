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
    type: z
      .enum(["public", "private"])
      .describe("public (shared library) or private (your cloned voices).")
      .optional(),
    engine: z
      .string()
      .describe(
        "Filter to voices compatible with an engine, e.g. starfish (required for generateSpeech).",
      )
      .optional(),
    language: z
      .string()
      .describe("Filter by language, e.g. English.")
      .optional(),
    gender: z.enum(["male", "female"]).describe("Filter by gender.").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (1-100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    token: z
      .string()
      .describe("Cursor (next_token) from a prior page.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(
      z.object({
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
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listVoices",
  title: "List Voices",
  description:
    "List voices, filterable by type, engine, language, or gender. The resolver for voice_id. Filter engine=starfish for generateSpeech-compatible voices.",
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
    const url = new URL(`https://api.heygen.com/v3/voices`);
    if (input.type !== undefined) {
      url.searchParams.set("type", String(input.type));
    }
    if (input.engine !== undefined) {
      url.searchParams.set("engine", String(input.engine));
    }
    if (input.language !== undefined) {
      url.searchParams.set("language", String(input.language));
    }
    if (input.gender !== undefined) {
      url.searchParams.set("gender", String(input.gender));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.token !== undefined) {
      url.searchParams.set("token", String(input.token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listVoices");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = {
      items: wirePayload.data,
      has_more: wirePayload.has_more,
      next_token: wirePayload.next_token,
    };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
