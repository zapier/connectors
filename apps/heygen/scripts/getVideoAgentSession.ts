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
    session_id: z
      .string()
      .describe(
        "Session id from createVideoAgentVideo or listVideoAgentSessions.",
      ),
  })
  .strict();
const outputSchema = z.object({
  session_id: z.string(),
  status: z
    .string()
    .describe(
      "thinking, waiting_for_input, reviewing, generating, completed, or failed.",
    ),
  progress: z.number().int().nullable().describe("Progress 0-100.").optional(),
  title: z.union([z.string(), z.null()]).optional(),
  video_id: z
    .union([
      z
        .string()
        .describe("Resulting video id; poll getVideo with it once present."),
      z
        .null()
        .describe("Resulting video id; poll getVideo with it once present."),
    ])
    .describe("Resulting video id; poll getVideo with it once present.")
    .optional(),
  created_at: z.number().int().describe("Unix timestamp (seconds)."),
  messages: z.array(z.record(z.string(), z.any())).nullable().optional(),
});

const definition = defineTool({
  name: "getVideoAgentSession",
  title: "Get Video Agent Session",
  description:
    "Get a Video Agent session's status, resulting video_id, and recent messages. Once video_id is set, fetch the final video with getVideo.",
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
    const url = `https://api.heygen.com/v3/video-agents/${encodeURIComponent(input.session_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getVideoAgentSession");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
