#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError, VoiceSchema } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    search: z
      .string()
      .describe(
        'Filter by name, description, labels, or category, e.g. "George".',
      )
      .optional(),
    category: z
      .enum(["premade", "cloned", "generated", "professional"])
      .describe("Only voices of this category.")
      .optional(),
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Voices per page, max 100. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    next_page_token: z
      .string()
      .describe(
        "Cursor from the previous response; pass with has_more true to page on.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  voices: z.array(VoiceSchema),
  has_more: z
    .boolean()
    .describe(
      "True when another page exists; pass next_page_token to fetch it.",
    ),
  next_page_token: z
    .string()
    .nullable()
    .describe("Cursor for the next page.")
    .optional(),
  total_count: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "listVoices",
  title: "List Voices",
  description:
    "List voices available to your account with their voice_ids. Search by name, description, labels, or category; paginate with has_more and next_page_token.",
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
    const url = new URL(`https://api.elevenlabs.io/v2/voices`);
    if (input.search !== undefined) {
      url.searchParams.set("search", String(input.search));
    }
    if (input.category !== undefined) {
      url.searchParams.set("category", String(input.category));
    }
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.next_page_token !== undefined) {
      url.searchParams.set("next_page_token", String(input.next_page_token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs listVoices");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
