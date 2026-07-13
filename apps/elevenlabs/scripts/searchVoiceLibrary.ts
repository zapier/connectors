#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    search: z.string().describe('Search term, e.g. "narrator".').optional(),
    language: z
      .string()
      .describe('ISO 639-1 language filter, e.g. "en".')
      .optional(),
    gender: z.string().describe('Gender filter, e.g. "female".').optional(),
    age: z
      .string()
      .describe('Age filter, e.g. "young", "middle_aged", "old".')
      .optional(),
    accent: z.string().describe('Accent filter, e.g. "american".').optional(),
    use_cases: z
      .string()
      .describe('Use-case filter, e.g. "narrative_story".')
      .optional(),
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Results per page, max 100. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    page: z
      .number()
      .int()
      .describe("Zero-based page number; increment while has_more is true.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  voices: z.array(
    z
      .object({
        public_owner_id: z
          .string()
          .describe("Owner ID; pass with voice_id to addSharedVoice."),
        voice_id: z
          .string()
          .describe(
            "The library voice's ID; pass with public_owner_id to addSharedVoice.",
          ),
        name: z.string(),
        category: z.string().nullable().optional(),
        gender: z.string().nullable().optional(),
        age: z.string().nullable().optional(),
        accent: z.string().nullable().optional(),
        language: z
          .string()
          .nullable()
          .describe("Primary ISO 639-1 language code.")
          .optional(),
        locale: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        use_case: z.string().nullable().optional(),
        preview_url: z
          .string()
          .nullable()
          .describe("URL of a short voice preview.")
          .optional(),
        free_users_allowed: z
          .boolean()
          .nullable()
          .describe("Whether free-tier accounts may use this voice.")
          .optional(),
        date_unix: z
          .number()
          .int()
          .nullable()
          .describe("Unix timestamp (seconds) when the voice was added.")
          .optional(),
      })
      .describe("A voice in the shared community library."),
  ),
  has_more: z
    .boolean()
    .describe("True when another page exists; increment page to fetch it."),
});

const definition = defineTool({
  name: "searchVoiceLibrary",
  title: "Search Voice Library",
  description:
    "Search the shared community voice library by language, gender, age, accent, or use case. Library voices are not usable for generation until added to the account with addSharedVoice.",
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
    const url = new URL(`https://api.elevenlabs.io/v1/shared-voices`);
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    if (input.language !== undefined) {
      url.searchParams.set("language", String(input.language));
    }
    if (input.gender !== undefined) {
      url.searchParams.set("gender", String(input.gender));
    }
    if (input.age !== undefined) {
      url.searchParams.set("age", String(input.age));
    }
    if (input.accent !== undefined) {
      url.searchParams.set("accent", String(input.accent));
    }
    if (input.use_cases !== undefined) {
      url.searchParams.set("use_cases", String(input.use_cases));
    }
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs searchVoiceLibrary");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
