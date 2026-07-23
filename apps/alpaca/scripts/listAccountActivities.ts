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
    activity_types: z
      .string()
      .describe(
        'Comma-separated activity codes, e.g. "FILL,DIV,CSD". Omit for all.',
      )
      .optional(),
    category: z.enum(["trade_activity", "non_trade_activity"]).optional(),
    date: z
      .string()
      .describe("Single day (YYYY-MM-DD) to fetch activities for.")
      .optional(),
    after: z
      .string()
      .describe("Return activities after this timestamp (RFC3339).")
      .optional(),
    until: z
      .string()
      .describe("Return activities before this timestamp (RFC3339).")
      .optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    page_token: z
      .string()
      .describe("Pagination cursor from a previous response.")
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.activity_types !== undefined && val.category !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Supply either activity_types or category, not both.",
        path: ["category"],
      });
    }
  });
const outputSchema = z.object({
  activities: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        activity_type: z
          .string()
          .nullable()
          .describe("e.g. FILL, DIV, CSD, FEE.")
          .optional(),
        transaction_time: z.string().nullable().optional(),
        type: z
          .string()
          .nullable()
          .describe("For FILL activities: fill or partial_fill.")
          .optional(),
        symbol: z.string().nullable().optional(),
        side: z.string().nullable().optional(),
        qty: z.string().nullable().optional(),
        price: z.string().nullable().optional(),
        net_amount: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .describe("Account activities."),
});

const definition = defineTool({
  name: "listAccountActivities",
  title: "List Account Activities",
  description:
    "List account activities — fills, dividends, fees, transfers, journals. Filter by activity_types (e.g. FILL, DIV) or by category, plus a date range.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = new URL(
      `https://paper-api.alpaca.markets/v2/account/activities`,
    );
    if (input.activity_types !== undefined) {
      url.searchParams.set("activity_types", String(input.activity_types));
    }
    if (input.category !== undefined) {
      url.searchParams.set("category", String(input.category));
    }
    if (input.date !== undefined) {
      url.searchParams.set("date", String(input.date));
    }
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    if (input.until !== undefined) {
      url.searchParams.set("until", String(input.until));
    }
    if (input.direction !== undefined) {
      url.searchParams.set("direction", String(input.direction));
    }
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.page_token !== undefined) {
      url.searchParams.set("page_token", String(input.page_token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listAccountActivities");
    return { activities: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
