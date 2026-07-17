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
    type: z
      .enum(["prompt", "photo", "digital_twin"])
      .describe("prompt (text-to-avatar), photo, or digital_twin."),
    name: z.string().describe("Display name for the new avatar.").optional(),
    prompt: z
      .string()
      .describe(
        "Description of the avatar to generate. Required when type=prompt.",
      )
      .optional(),
    image_url: z
      .string()
      .describe("Public HTTPS image URL (photo/digital-twin source).")
      .optional(),
    video_url: z
      .string()
      .describe("Public HTTPS video URL (digital-twin source).")
      .optional(),
    consent_video_url: z
      .string()
      .describe("Consent video URL when the flow requires it.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  avatar_item: z
    .object({
      id: z
        .string()
        .describe("Look id — pass this as avatar_id to createVideo."),
      name: z.string(),
      avatar_type: z.enum(["studio_avatar", "digital_twin", "photo_avatar"]),
      group_id: z.string().nullable().optional(),
      preview_image_url: z.string().nullable().optional(),
      preview_video_url: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
      default_voice_id: z
        .string()
        .nullable()
        .describe("A voice that pairs well with this look.")
        .optional(),
      supported_api_engines: z.array(z.string()).nullable().optional(),
      status: z
        .string()
        .nullable()
        .describe("processing, pending_consent, failed, or completed.")
        .optional(),
    })
    .nullable()
    .optional(),
  avatar_group: z
    .object({
      id: z.string().describe("Avatar group id."),
      name: z.string(),
      preview_image_url: z.string().nullable().optional(),
      preview_video_url: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
      created_at: z.number().int().describe("Unix timestamp (seconds)."),
      looks_count: z
        .number()
        .int()
        .describe("Number of looks available for this avatar."),
      default_voice_id: z.string().nullable().optional(),
      consent_status: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "createAvatar",
  title: "Create Avatar",
  description:
    "Start asynchronous avatar creation from a text prompt (type=prompt) or from photo/digital-twin media. The look trains in the background — poll getAvatarGroup/getAvatarLook.",
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
    const url = `https://api.heygen.com/v3/avatars`;
    const body: Record<string, unknown> = {};
    if (input.type !== undefined) body["type"] = input.type;
    if (input.name !== undefined) body["name"] = input.name;
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.image_url !== undefined) body["image_url"] = input.image_url;
    if (input.video_url !== undefined) body["video_url"] = input.video_url;
    if (input.consent_video_url !== undefined)
      body["consent_video_url"] = input.consent_video_url;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen createAvatar");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
