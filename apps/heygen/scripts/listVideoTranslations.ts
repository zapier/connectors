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
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (1-100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
        id: z.string(),
        title: z.union([z.string(), z.null()]).optional(),
        status: z.string().describe("pending, running, completed, or failed."),
        output_language: z.union([z.string(), z.null()]).optional(),
        input_language: z.union([z.string(), z.null()]).optional(),
        duration: z.union([z.number(), z.null()]).optional(),
        video_url: z
          .union([
            z
              .string()
              .describe(
                "Translated video URL (presigned, expires). Present when completed.",
              ),
            z
              .null()
              .describe(
                "Translated video URL (presigned, expires). Present when completed.",
              ),
          ])
          .describe(
            "Translated video URL (presigned, expires). Present when completed.",
          )
          .optional(),
        audio_url: z.union([z.string(), z.null()]).optional(),
        srt_caption_url: z.union([z.string(), z.null()]).optional(),
        vtt_caption_url: z.union([z.string(), z.null()]).optional(),
        created_at: z.union([z.number().int(), z.null()]).optional(),
        failure_message: z.union([z.string(), z.null()]).optional(),
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listVideoTranslations",
  title: "List Video Translations",
  description: "List video-translation jobs in the account with their status.",
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
    const url = new URL(`https://api.heygen.com/v3/video-translations`);
    url.searchParams.set("limit", String(input.limit ?? 10));
    if (input.token !== undefined) {
      url.searchParams.set("token", String(input.token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listVideoTranslations");
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
