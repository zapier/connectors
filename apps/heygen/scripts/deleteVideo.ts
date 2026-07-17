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
    video_id: z
      .string()
      .describe("Video to delete (from listVideos or createVideo)."),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .nullable()
    .describe("Id of the deleted video, when returned.")
    .optional(),
});

const definition = defineTool({
  name: "deleteVideo",
  title: "Delete Video",
  description:
    "Permanently delete a video and its files. This cannot be undone.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/videos/${encodeURIComponent(input.video_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Heygen deleteVideo");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
