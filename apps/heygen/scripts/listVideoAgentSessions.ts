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
        session_id: z.string(),
        status: z
          .string()
          .describe(
            "thinking, waiting_for_input, reviewing, generating, completed, or failed.",
          ),
        progress: z
          .number()
          .int()
          .nullable()
          .describe("Progress 0-100.")
          .optional(),
        title: z.union([z.string(), z.null()]).optional(),
        video_id: z
          .union([
            z
              .string()
              .describe(
                "Resulting video id; poll getVideo with it once present.",
              ),
            z
              .null()
              .describe(
                "Resulting video id; poll getVideo with it once present.",
              ),
          ])
          .describe("Resulting video id; poll getVideo with it once present.")
          .optional(),
        created_at: z.number().int().describe("Unix timestamp (seconds)."),
        messages: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listVideoAgentSessions",
  title: "List Video Agent Sessions",
  description:
    "List Video Agent sessions in the account with their status. The resolver for session_id.",
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
    const url = new URL(`https://api.heygen.com/v3/video-agents`);
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.token !== undefined) {
      url.searchParams.set("token", String(input.token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listVideoAgentSessions");
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
