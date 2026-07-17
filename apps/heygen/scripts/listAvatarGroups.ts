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
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listAvatarGroups",
  title: "List Avatar Groups",
  description:
    "List avatar groups (each holds one or more looks). The resolver for group_id. Pass a look id, not a group id, to video tools.",
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
    const url = new URL(`https://api.heygen.com/v3/avatars`);
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
    await throwIfNotOk(res, "Heygen listAvatarGroups");
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
