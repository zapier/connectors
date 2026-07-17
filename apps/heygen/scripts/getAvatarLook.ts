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
    look_id: z
      .string()
      .describe("Look id (= avatar_id), from listAvatarLooks."),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("Look id — pass this as avatar_id to createVideo."),
  name: z.string(),
  avatar_type: z.enum(["studio_avatar", "digital_twin", "photo_avatar"]),
  group_id: z.union([z.string(), z.null()]).optional(),
  preview_image_url: z.union([z.string(), z.null()]).optional(),
  preview_video_url: z.union([z.string(), z.null()]).optional(),
  gender: z.union([z.string(), z.null()]).optional(),
  default_voice_id: z
    .union([
      z.string().describe("A voice that pairs well with this look."),
      z.null().describe("A voice that pairs well with this look."),
    ])
    .describe("A voice that pairs well with this look.")
    .optional(),
  supported_api_engines: z.array(z.string()).nullable().optional(),
  status: z
    .union([
      z.string().describe("processing, pending_consent, failed, or completed."),
      z.null().describe("processing, pending_consent, failed, or completed."),
    ])
    .describe("processing, pending_consent, failed, or completed.")
    .optional(),
});

const definition = defineTool({
  name: "getAvatarLook",
  title: "Get Avatar Look",
  description:
    "Get one avatar look's details (previews, type, training status) by look id. Use to confirm a look is completed before using it in a video.",
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
    const url = `https://api.heygen.com/v3/avatars/looks/${encodeURIComponent(input.look_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getAvatarLook");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
