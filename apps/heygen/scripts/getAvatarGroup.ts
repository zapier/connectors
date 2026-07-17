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
    group_id: z.string().describe("Avatar group id from listAvatarGroups."),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("Avatar group id."),
  name: z.string(),
  preview_image_url: z.union([z.string(), z.null()]).optional(),
  preview_video_url: z.union([z.string(), z.null()]).optional(),
  gender: z.union([z.string(), z.null()]).optional(),
  created_at: z.number().int().describe("Unix timestamp (seconds)."),
  looks_count: z
    .number()
    .int()
    .describe("Number of looks available for this avatar."),
  default_voice_id: z.union([z.string(), z.null()]).optional(),
  consent_status: z.union([z.string(), z.null()]).optional(),
  status: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getAvatarGroup",
  title: "Get Avatar Group",
  description:
    "Get one avatar group's details (name, previews, looks count, status) by group id.",
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
    const url = `https://api.heygen.com/v3/avatars/${encodeURIComponent(input.group_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getAvatarGroup");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
