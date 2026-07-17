#!/usr/bin/env node
// Cinematic Avatar shares POST /v3/videos with createVideo — it's the `cinematic_avatar`
// member of that endpoint's request union, split out as its own tool for a cleaner
// input schema.
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    prompt: z
      .string()
      .describe(
        "Natural-language description of the clip to generate (1-10000 chars).",
      ),
    avatar_id: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "1-3 avatar look ids to feature (from listAvatarLooks). A look id is the avatar_id.",
      ),
    aspect_ratio: z
      .enum(["16:9", "9:16", "1:1"])
      .describe("Output aspect ratio.")
      .optional(),
    resolution: z
      .enum(["720p", "1080p"])
      .describe("Output resolution.")
      .optional(),
    duration: z
      .number()
      .int()
      .gte(4)
      .lte(15)
      .describe(
        "Clip length in seconds (4-15). Omit and set auto_duration=true to let the model choose.",
      )
      .optional(),
    auto_duration: z
      .boolean()
      .describe("Let the model choose the length (omit duration).")
      .optional(),
    enhance_prompt: z
      .boolean()
      .describe("Enable server-side prompt enhancement.")
      .optional(),
    title: z
      .string()
      .describe("Organizational title (not shown in the video).")
      .optional(),
    callback_url: z
      .string()
      .describe(
        "Optional URL HeyGen POSTs to on completion (for callers running their own receiver).",
      )
      .optional(),
    callback_id: z
      .string()
      .describe(
        "Optional client reference echoed back in status responses and callbacks.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  video_id: z.string().describe("Id of the created video; poll with getVideo."),
  status: z
    .string()
    .describe(
      "Initial status (e.g. waiting), before processing/completed/failed.",
    ),
  output_format: z.enum(["mp4", "webm"]).nullable().optional(),
});

const definition = defineTool({
  name: "createCinematicVideo",
  title: "Create Cinematic Video",
  description:
    "Generate a short cinematic avatar clip (4-15s) from a natural-language prompt and 1-3 avatar looks. Flat-priced per video. Returns a video_id to poll with getVideo.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/videos`;
    const body: Record<string, unknown> = { type: "cinematic_avatar" };
    body["prompt"] = input.prompt;
    body["avatar_id"] = input.avatar_id;
    if (input.aspect_ratio !== undefined)
      body["aspect_ratio"] = input.aspect_ratio;
    if (input.resolution !== undefined) body["resolution"] = input.resolution;
    if (input.duration !== undefined) body["duration"] = input.duration;
    if (input.auto_duration !== undefined)
      body["auto_duration"] = input.auto_duration;
    if (input.enhance_prompt !== undefined)
      body["enhance_prompt"] = input.enhance_prompt;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.callback_url !== undefined)
      body["callback_url"] = input.callback_url;
    if (input.callback_id !== undefined)
      body["callback_id"] = input.callback_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen createCinematicVideo");
    const wirePayload = (await res.json()) as { data: unknown };
    return wirePayload.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
