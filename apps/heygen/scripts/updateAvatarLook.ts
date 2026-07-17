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
    look_id: z.string().describe("Look to rename (from listAvatarLooks)."),
    name: z.string().describe("New display name."),
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
  name: "updateAvatarLook",
  title: "Update Avatar Look",
  description: "Rename an avatar look.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/avatars/looks/${encodeURIComponent(input.look_id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen updateAvatarLook");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
