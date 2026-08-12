#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    project_id: z
      .number()
      .int()
      .describe("Project to log against. From listProjects."),
    task_id: z
      .number()
      .int()
      .describe(
        "Task to log against, from listProjectTaskAssignments — a project's task assignments govern how time on that task bills.",
      ),
    spent_date: z
      .string()
      .date()
      .describe("Day the time was spent, YYYY-MM-DD."),
    started_time: z
      .string()
      .describe(
        'When the entry started, 12-hour clock, e.g. "8:00am". Defaults to the current time.',
      )
      .optional(),
    ended_time: z
      .string()
      .describe(
        'When the entry ended, e.g. "9:00am". Omit to leave the timer running (is_running: true).',
      )
      .optional(),
    user_id: z
      .number()
      .int()
      .describe(
        "User the entry belongs to. Defaults to the authenticated user (getCurrentUser).",
      )
      .optional(),
    notes: z.string().describe("Free-text notes for the entry.").optional(),
    external_reference: z
      .object({
        id: z.string().describe("External record id.").optional(),
        group_id: z.string().describe("External group id.").optional(),
        account_id: z.string().describe("External account id.").optional(),
        permalink: z
          .string()
          .describe("Link back to the external record.")
          .optional(),
      })
      .strict()
      .describe("External-system linkage for a time entry.")
      .optional(),
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
  name: "createTimeEntryForTimestamps",
  title: "Create Time Entry For Timestamps",
  description:
    "Log time by start and end time for a day. Use when the account tracks time by start/end timestamps. Omit ended_time to leave a running timer. Only valid in timestamps-mode accounts (company.wants_timestamp_timers === true); duration-mode accounts require createTimeEntry. Check getCompany.wants_timestamp_timers if unsure.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/time_entries`;
    const body: Record<string, unknown> = {};
    if (input.project_id !== undefined) body["project_id"] = input.project_id;
    if (input.task_id !== undefined) body["task_id"] = input.task_id;
    if (input.spent_date !== undefined) body["spent_date"] = input.spent_date;
    if (input.started_time !== undefined)
      body["started_time"] = input.started_time;
    if (input.ended_time !== undefined) body["ended_time"] = input.ended_time;
    if (input.user_id !== undefined) body["user_id"] = input.user_id;
    if (input.notes !== undefined) body["notes"] = input.notes;
    if (input.external_reference !== undefined)
      body["external_reference"] = input.external_reference;
    const res = await harvestFetch(
      ctx.fetch,
      "createTimeEntryForTimestamps",
      url,
      { method: "POST", body: JSON.stringify(body) },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
