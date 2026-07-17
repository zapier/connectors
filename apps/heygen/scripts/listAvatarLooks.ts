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
    group_id: z
      .string()
      .describe("Only looks in this avatar group (from listAvatarGroups).")
      .optional(),
    avatar_type: z
      .enum(["studio_avatar", "digital_twin", "photo_avatar"])
      .describe("Filter by avatar type.")
      .optional(),
    ownership: z
      .enum(["public", "private"])
      .describe("public (preset) or private (yours).")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (1-100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    token: z
      .string()
      .describe("Cursor (next_token) from a prior page.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z
          .string()
          .describe("Look id — pass this as avatar_id to createVideo."),
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
            z
              .string()
              .describe("processing, pending_consent, failed, or completed."),
            z
              .null()
              .describe("processing, pending_consent, failed, or completed."),
          ])
          .describe("processing, pending_consent, failed, or completed.")
          .optional(),
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listAvatarLooks",
  title: "List Avatar Looks",
  description:
    "List avatar looks — the resolver for avatar_id (a look id is the avatar_id passed to createVideo). Filter by group, type, or ownership.",
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
    const url = new URL(`https://api.heygen.com/v3/avatars/looks`);
    if (input.group_id !== undefined) {
      url.searchParams.set("group_id", String(input.group_id));
    }
    if (input.avatar_type !== undefined) {
      url.searchParams.set("avatar_type", String(input.avatar_type));
    }
    if (input.ownership !== undefined) {
      url.searchParams.set("ownership", String(input.ownership));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.token !== undefined) {
      url.searchParams.set("token", String(input.token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listAvatarLooks");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = {
      items: wirePayload.data,
      has_more: wirePayload.has_more,
      next_token: wirePayload.next_token,
    };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
