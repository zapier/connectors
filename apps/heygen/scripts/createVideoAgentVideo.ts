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
    prompt: z
      .string()
      .describe("Description of the video to create (1-10000 chars)."),
    mode: z
      .enum(["generate", "chat"])
      .describe(
        "generate (one-shot, default) or chat (multi-turn; enables sendVideoAgentMessage).",
      )
      .optional(),
    avatar_id: z
      .string()
      .describe(
        "Pin a specific avatar look (from listAvatarLooks); omit to let the agent choose.",
      )
      .optional(),
    voice_id: z
      .string()
      .describe("Pin a voice (from listVoices); omit to let the agent choose.")
      .optional(),
    style_id: z
      .string()
      .describe(
        "Optional Video Agent visual-style id (free-text; no in-catalog resolver in v1).",
      )
      .optional(),
    orientation: z
      .enum(["landscape", "portrait"])
      .describe("Video orientation.")
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
  session_id: z
    .string()
    .describe("Session id; poll with getVideoAgentSession."),
  status: z
    .string()
    .describe(
      "Initial session status (generating, thinking, completed, failed).",
    ),
  video_id: z
    .union([
      z
        .string()
        .describe(
          "Resulting video id once the agent produces one; poll getVideo with it.",
        ),
      z
        .null()
        .describe(
          "Resulting video id once the agent produces one; poll getVideo with it.",
        ),
    ])
    .describe(
      "Resulting video id once the agent produces one; poll getVideo with it.",
    )
    .optional(),
  created_at: z
    .number()
    .int()
    .describe("Unix timestamp (seconds) of session creation."),
});

const definition = defineTool({
  name: "createVideoAgentVideo",
  title: "Create Video Agent Video",
  description:
    "Start a Video Agent session from a text prompt — the agent plans and generates a full video. Returns a session_id to poll with getVideoAgentSession.",
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
    const url = `https://api.heygen.com/v3/video-agents`;
    const body: Record<string, unknown> = {};
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.mode !== undefined) body["mode"] = input.mode;
    if (input.avatar_id !== undefined) body["avatar_id"] = input.avatar_id;
    if (input.voice_id !== undefined) body["voice_id"] = input.voice_id;
    if (input.style_id !== undefined) body["style_id"] = input.style_id;
    if (input.orientation !== undefined)
      body["orientation"] = input.orientation;
    if (input.callback_url !== undefined)
      body["callback_url"] = input.callback_url;
    if (input.callback_id !== undefined)
      body["callback_id"] = input.callback_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen createVideoAgentVideo");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
