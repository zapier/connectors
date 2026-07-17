#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  items_count: z
    .number()
    .int()
    .describe("Number of rows returned (usually 1)."),
  cost: z
    .number()
    .nullable()
    .describe("Credit cost in USD (0 for this endpoint).")
    .optional(),
  items: z
    .array(
      z.object({
        login: z
          .string()
          .nullable()
          .describe("Account login (email).")
          .optional(),
        money: z
          .object({
            balance: z
              .number()
              .nullable()
              .describe("Remaining credit balance in USD.")
              .optional(),
            total: z
              .number()
              .nullable()
              .describe("Total funded in USD.")
              .optional(),
          })
          .nullable()
          .describe("Credit balance and funding.")
          .optional(),
        rates: z
          .object({
            limits: z
              .record(z.string(), z.json())
              .nullable()
              .describe("Per-minute and simultaneous request limits.")
              .optional(),
          })
          .nullable()
          .describe("Account rate limits.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Account rows.")
    .optional(),
});

const definition = defineTool({
  name: "getAccountBalance",
  title: "Get Account Balance",
  description:
    "Get the authenticated account's details: remaining credit balance, plan limits, and rate. Use as an auth check and to see credits before costly calls.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dataforseo",
  run: async (_input, ctx) =>
    dataforseoLive(
      ctx.fetch,
      "/v3/appendix/user_data",
      {},
      "DataForSEO getAccountBalance",
      { method: "GET" },
    ),
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
