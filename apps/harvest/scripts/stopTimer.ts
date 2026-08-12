#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z
      .number()
      .int()
      .describe(
        "Running time entry to stop. From listTimeEntries with is_running true.",
      ),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Time entry id."),
  spent_date: z.string().date().describe("Day the time was spent, YYYY-MM-DD."),
  user: z
    .object({
      id: z.number().int().describe("User id."),
      name: z.string().describe("User name."),
    })
    .nullable()
    .describe("A lightweight id + name reference to a related resource.")
    .optional(),
  client: z
    .object({
      id: z.number().int().describe("Client id."),
      name: z.string().describe("Client name."),
    })
    .nullable()
    .describe("A lightweight id + name reference to a related resource.")
    .optional(),
  project: z
    .object({
      id: z.number().int().describe("Project id."),
      name: z.string().describe("Project name."),
    })
    .nullable()
    .describe("A lightweight id + name reference to a related resource.")
    .optional(),
  task: z
    .object({
      id: z.number().int().describe("Task id."),
      name: z.string().describe("Task name."),
    })
    .nullable()
    .describe("A lightweight id + name reference to a related resource.")
    .optional(),
  hours: z.number().describe("Hours logged (decimal)."),
  rounded_hours: z
    .number()
    .nullable()
    .describe("Hours after the account's rounding rule.")
    .optional(),
  notes: z
    .union([
      z.string().describe("Notes on the entry."),
      z.null().describe("Notes on the entry."),
    ])
    .describe("Notes on the entry.")
    .optional(),
  is_running: z.boolean().describe("Whether the timer is currently running."),
  timer_started_at: z
    .union([
      z
        .string()
        .describe("When the running timer started (ISO 8601), or null."),
      z.null().describe("When the running timer started (ISO 8601), or null."),
    ])
    .describe("When the running timer started (ISO 8601), or null.")
    .optional(),
  started_time: z
    .union([
      z
        .string()
        .describe(
          'Start time as a 12-hour clock string, e.g. "8:00am", or null.',
        ),
      z
        .null()
        .describe(
          'Start time as a 12-hour clock string, e.g. "8:00am", or null.',
        ),
    ])
    .describe('Start time as a 12-hour clock string, e.g. "8:00am", or null.')
    .optional(),
  ended_time: z
    .union([
      z
        .string()
        .describe(
          'End time as a 12-hour clock string, e.g. "9:00am", or null.',
        ),
      z
        .null()
        .describe(
          'End time as a 12-hour clock string, e.g. "9:00am", or null.',
        ),
    ])
    .describe('End time as a 12-hour clock string, e.g. "9:00am", or null.')
    .optional(),
  billable: z
    .boolean()
    .nullable()
    .describe("Whether the entry is billable.")
    .optional(),
  is_billed: z
    .boolean()
    .nullable()
    .describe("Whether the entry has been invoiced.")
    .optional(),
  is_locked: z
    .boolean()
    .nullable()
    .describe("Whether the entry is locked from editing.")
    .optional(),
  locked_reason: z
    .union([
      z.string().describe("Why the entry is locked, if it is."),
      z.null().describe("Why the entry is locked, if it is."),
    ])
    .describe("Why the entry is locked, if it is.")
    .optional(),
  approval_status: z
    .string()
    .nullable()
    .describe("One of unsubmitted, submitted, or approved.")
    .optional(),
  created_at: z
    .string()
    .nullable()
    .describe("Creation timestamp (ISO 8601).")
    .optional(),
  updated_at: z
    .string()
    .nullable()
    .describe("Last-update timestamp (ISO 8601).")
    .optional(),
});

const definition = defineTool({
  name: "stopTimer",
  title: "Stop Timer",
  description:
    "Stop a currently-running time entry, finalizing its hours. Only valid when the entry is running.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/time_entries/${encodeURIComponent(input.id)}/stop`;
    const res = await harvestFetch(ctx.fetch, "stopTimer", url, {
      method: "PATCH",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
