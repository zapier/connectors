#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  username: z.string(),
  email: z.union([z.string(), z.null()]).optional(),
  first_name: z.union([z.string(), z.null()]).optional(),
  last_name: z.union([z.string(), z.null()]).optional(),
  billing_type: z
    .union([
      z
        .string()
        .describe(
          "wallet, subscription, or usage_based — selects which balance field below applies.",
        ),
      z
        .null()
        .describe(
          "wallet, subscription, or usage_based — selects which balance field below applies.",
        ),
    ])
    .describe(
      "wallet, subscription, or usage_based — selects which balance field below applies.",
    )
    .optional(),
  wallet: z
    .union([
      z
        .object({
          remaining_balance: z.union([z.number(), z.null()]).optional(),
          currency: z.union([z.string(), z.null()]).optional(),
          auto_reload: z
            .union([
              z.object({
                enabled: z.union([z.boolean(), z.null()]).optional(),
              }),
              z.null(),
            ])
            .optional(),
        })
        .describe("Prepaid balance (when billing_type=wallet)."),
      z.null().describe("Prepaid balance (when billing_type=wallet)."),
    ])
    .describe("Prepaid balance (when billing_type=wallet).")
    .optional(),
  usage_based: z
    .union([
      z
        .object({
          included_credits: z.union([z.number(), z.null()]).optional(),
          remaining_credits: z.union([z.number(), z.null()]).optional(),
          spending_current_usd: z.union([z.number(), z.null()]).optional(),
          spending_cap_usd: z.union([z.number(), z.null()]).optional(),
        })
        .describe("Credit usage (when billing_type=usage_based)."),
      z.null().describe("Credit usage (when billing_type=usage_based)."),
    ])
    .describe("Credit usage (when billing_type=usage_based).")
    .optional(),
  subscription: z
    .union([
      z
        .object({
          plan: z.union([z.string(), z.null()]).optional(),
          credits: z
            .union([
              z.object({
                add_on_credits: z
                  .union([z.record(z.string(), z.number()), z.null()])
                  .optional(),
                premium_credits: z
                  .union([z.record(z.string(), z.number()), z.null()])
                  .optional(),
              }),
              z.null(),
            ])
            .optional(),
        })
        .describe("Plan credits (when billing_type=subscription)."),
      z.null().describe("Plan credits (when billing_type=subscription)."),
    ])
    .describe("Plan credits (when billing_type=subscription).")
    .optional(),
});

const definition = defineTool({
  name: "getCurrentUser",
  title: "Get Current User",
  description:
    "Get the authenticated account's profile and remaining credit balance. Check before a generate call to avoid insufficient_credit.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (_input, ctx) => {
    const url = `https://api.heygen.com/v3/users/me`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getCurrentUser");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
