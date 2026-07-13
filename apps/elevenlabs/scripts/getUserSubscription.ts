#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  tier: z
    .string()
    .describe('Plan name, e.g. "free", "starter", "creator", "pro".'),
  character_count: z
    .number()
    .int()
    .describe("Characters used in the current billing period."),
  character_limit: z
    .number()
    .int()
    .describe("Character quota for the current billing period."),
  next_character_count_reset_unix: z
    .number()
    .int()
    .nullable()
    .describe("Unix timestamp (seconds) when the quota resets.")
    .optional(),
  status: z
    .string()
    .describe('Subscription status, e.g. "active", "trialing", "free".'),
  billing_period: z
    .string()
    .nullable()
    .describe("The subscription's billing period.")
    .optional(),
  voice_slots_used: z
    .number()
    .int()
    .nullable()
    .describe("Voice slots currently in use.")
    .optional(),
  voice_limit: z
    .number()
    .int()
    .nullable()
    .describe("Total custom-voice slots on this plan.")
    .optional(),
  can_use_instant_voice_cloning: z.boolean().nullable().optional(),
  can_use_professional_voice_cloning: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "getUserSubscription",
  title: "Get User Subscription",
  description:
    "Check subscription tier, character-credit usage and limit, next reset time, and voice-slot usage. Use before large generations or when a call fails for quota.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (_input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/user/subscription`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs getUserSubscription");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
