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
    lipsync_id: z.string().describe("Id from createLipsync or listLipsyncs."),
  })
  .strict();
const outputSchema = z.object({
  id: z.string(),
  title: z.union([z.string(), z.null()]).optional(),
  status: z.string().describe("pending, running, completed, or failed."),
  duration: z.union([z.number(), z.null()]).optional(),
  video_url: z
    .union([
      z
        .string()
        .describe(
          "Output video URL (presigned, expires). Present when completed.",
        ),
      z
        .null()
        .describe(
          "Output video URL (presigned, expires). Present when completed.",
        ),
    ])
    .describe("Output video URL (presigned, expires). Present when completed.")
    .optional(),
  caption_url: z.union([z.string(), z.null()]).optional(),
  created_at: z.union([z.number().int(), z.null()]).optional(),
  failure_message: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getLipsync",
  title: "Get Lipsync",
  description:
    "Poll a lipsync job's status and, once completed, get the output video URL and captions. Call until status is completed or failed.",
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
    const url = `https://api.heygen.com/v3/lipsyncs/${encodeURIComponent(input.lipsync_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getLipsync");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
