#!/usr/bin/env node
// captions.download returns a raw caption FILE body (srt/vtt/sbv/scc/ttml text),
// not a JSON resource — so the response is read as text and wrapped here rather
// than parsed as JSON.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe("The caption track id to download (from listCaptions)."),
    tfmt: z
      .enum(["srt", "vtt", "sbv", "scc", "ttml"])
      .describe("Output caption format. Defaults to srt.")
      .default("srt"),
    tlang: z
      .string()
      .describe(
        "Optional BCP-47 language code (e.g. es) to request a machine translation of the track.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  caption_text: z
    .string()
    .describe("The caption track text in the requested format."),
  format: z.string().describe("The format the text was returned in."),
});

const definition = defineTool({
  name: "downloadCaption",
  title: "Download Caption",
  description:
    "Download a caption track's text in a chosen format (srt, vtt, sbv, scc, or ttml). Resolve the track id via listCaptions. Requires permission to edit the video (the owner or an editor) and the youtube.force-ssl scope.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(input.id)}`,
    );
    url.searchParams.set("tfmt", input.tfmt);
    if (input.tlang !== undefined) url.searchParams.set("tlang", input.tlang);

    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForYouTube(res, "downloadCaption");
    const caption_text = await res.text();
    return { caption_text, format: input.tfmt };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
