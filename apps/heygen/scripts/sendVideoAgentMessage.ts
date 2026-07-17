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
    session_id: z.string().describe("A session created with mode=chat."),
    message: z.string().describe("Reply, added context, or a requested edit."),
    avatar_id: z
      .string()
      .describe("Override the avatar for this revision.")
      .optional(),
    voice_id: z
      .string()
      .describe("Override the voice for this revision.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  session_id: z.string(),
  run_id: z.string().describe("Run id for this message's processing."),
  title: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "sendVideoAgentMessage",
  title: "Send Video Agent Message",
  description:
    "Send a follow-up or revision message to a chat-mode Video Agent session. After sending, poll getVideoAgentSession for the updated status and video_id.",
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
    const url = `https://api.heygen.com/v3/video-agents/${encodeURIComponent(input.session_id)}`;
    const body: Record<string, unknown> = {};
    if (input.message !== undefined) body["message"] = input.message;
    if (input.avatar_id !== undefined) body["avatar_id"] = input.avatar_id;
    if (input.voice_id !== undefined) body["voice_id"] = input.voice_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen sendVideoAgentMessage");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
