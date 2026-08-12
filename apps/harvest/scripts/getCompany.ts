#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  name: z.string().describe("Company / account name."),
  is_active: z
    .boolean()
    .nullable()
    .describe("Whether the account is active.")
    .optional(),
  week_start_day: z
    .string()
    .nullable()
    .describe("Week start day (Saturday, Sunday, or Monday).")
    .optional(),
  wants_timestamp_timers: z
    .boolean()
    .describe(
      "When true the account tracks time by start/end times (use createTimeEntryForTimestamps); when false it tracks by duration (use createTimeEntry).",
    ),
  time_format: z
    .string()
    .nullable()
    .describe("How time displays (decimal or hours_minutes).")
    .optional(),
  date_format: z.string().nullable().describe("How dates display.").optional(),
  plan_type: z
    .string()
    .nullable()
    .describe("The account's plan tier.")
    .optional(),
  clock: z.string().nullable().describe("Clock style (12h or 24h).").optional(),
  weekly_capacity: z
    .number()
    .int()
    .nullable()
    .describe("Default weekly capacity in seconds.")
    .optional(),
  expense_feature: z
    .boolean()
    .nullable()
    .describe("Whether expense tracking is enabled.")
    .optional(),
  invoice_feature: z
    .boolean()
    .nullable()
    .describe("Whether invoicing is enabled.")
    .optional(),
  estimate_feature: z
    .boolean()
    .nullable()
    .describe("Whether estimates are enabled.")
    .optional(),
  approval_feature: z
    .boolean()
    .nullable()
    .describe("Whether time approval is enabled.")
    .optional(),
});

const definition = defineTool({
  name: "getCompany",
  title: "Get Company",
  description:
    "Retrieve account settings, most importantly wants_timestamp_timers (which decides whether to use createTimeEntry or createTimeEntryForTimestamps) and the plan feature flags.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (_input, ctx) => {
    const url = `https://api.harvestapp.com/v2/company`;
    const res = await harvestFetch(ctx.fetch, "getCompany", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
