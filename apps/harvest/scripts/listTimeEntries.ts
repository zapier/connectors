#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    user_id: z
      .number()
      .int()
      .describe(
        'Only entries for this user. Use getCurrentUser\'s id for "my time".',
      )
      .optional(),
    client_id: z
      .number()
      .int()
      .describe("Only entries for this client. From listClients.")
      .optional(),
    project_id: z
      .number()
      .int()
      .describe("Only entries for this project. From listProjects.")
      .optional(),
    task_id: z
      .number()
      .int()
      .describe("Only entries for this task. From listProjectTaskAssignments.")
      .optional(),
    is_running: z
      .boolean()
      .describe("true for only running timers, false for only stopped.")
      .optional(),
    is_billed: z.boolean().describe("Filter by invoiced state.").optional(),
    approval_status: z
      .enum(["unsubmitted", "submitted", "approved"])
      .describe("Filter by approval status.")
      .optional(),
    from: z
      .string()
      .date()
      .describe("Earliest spent_date, YYYY-MM-DD.")
      .optional(),
    to: z.string().date().describe("Latest spent_date, YYYY-MM-DD.").optional(),
    updated_since: z
      .string()
      .describe("Only entries updated on/after this ISO 8601 timestamp.")
      .optional(),
    page: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page number to retrieve (1-based). DEPRECATED by Harvest for cursor-paginated endpoints — prefer following the response's links.next URL to page the tail rather than constructing page=n directly.",
      )
      .optional(),
    per_page: z
      .number()
      .int()
      .gte(1)
      .lte(2000)
      .describe(
        "Maximum records to return per page (1–2000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  page: z
    .number()
    .int()
    .nullable()
    .describe(
      "The current page number. Under cursor-based pagination this (and next_page/previous_page) is null on all but the first and last pages, so DO NOT page by incrementing it — follow links.next instead.",
    ),
  total_pages: z
    .number()
    .int()
    .describe("Total number of pages for the query."),
  total_entries: z
    .number()
    .int()
    .describe("Total number of records matching the query."),
  next_page: z
    .number()
    .int()
    .nullable()
    .describe(
      "Next page number, or null on the last page. Null on interior pages under cursor pagination — follow links.next to reach the tail.",
    )
    .optional(),
  previous_page: z
    .number()
    .int()
    .nullable()
    .describe("Previous page number, or null on the first page.")
    .optional(),
  links: z.object({
    first: z.string().describe("URL of the first page of results."),
    next: z
      .string()
      .nullable()
      .describe(
        "URL of the next page, or null on the last page. Follow this to page the tail — it carries the correct page or cursor query param.",
      )
      .optional(),
    previous: z
      .string()
      .nullable()
      .describe("URL of the previous page, or null on the first page.")
      .optional(),
    last: z.string().describe("URL of the last page of results."),
  }),
  time_entries: z.array(
    z.object({
      id: z.number().int().describe("Time entry id."),
      spent_date: z
        .string()
        .date()
        .describe("Day the time was spent, YYYY-MM-DD."),
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
      notes: z.string().nullable().describe("Notes on the entry.").optional(),
      is_running: z
        .boolean()
        .describe("Whether the timer is currently running."),
      timer_started_at: z
        .string()
        .nullable()
        .describe("When the running timer started (ISO 8601), or null.")
        .optional(),
      started_time: z
        .string()
        .nullable()
        .describe(
          'Start time as a 12-hour clock string, e.g. "8:00am", or null.',
        )
        .optional(),
      ended_time: z
        .string()
        .nullable()
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
        .string()
        .nullable()
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
    }),
  ),
});

const definition = defineTool({
  name: "listTimeEntries",
  title: "List Time Entries",
  description:
    "List time entries, filtered by user, client, project, task, date range, running or billed state, or approval status. Page-based. Use is_running true plus user_id to find the entry to stopTimer. Returns individual entries, not aggregate totals — this connector does not expose Harvest's Reports API.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = new URL(`https://api.harvestapp.com/v2/time_entries`);
    if (input.user_id !== undefined) {
      url.searchParams.set("user_id", String(input.user_id));
    }
    if (input.client_id !== undefined) {
      url.searchParams.set("client_id", String(input.client_id));
    }
    if (input.project_id !== undefined) {
      url.searchParams.set("project_id", String(input.project_id));
    }
    if (input.task_id !== undefined) {
      url.searchParams.set("task_id", String(input.task_id));
    }
    if (input.is_running !== undefined) {
      url.searchParams.set("is_running", String(input.is_running));
    }
    if (input.is_billed !== undefined) {
      url.searchParams.set("is_billed", String(input.is_billed));
    }
    if (input.approval_status !== undefined) {
      url.searchParams.set("approval_status", String(input.approval_status));
    }
    if (input.from !== undefined) {
      url.searchParams.set("from", String(input.from));
    }
    if (input.to !== undefined) {
      url.searchParams.set("to", String(input.to));
    }
    if (input.updated_since !== undefined) {
      url.searchParams.set("updated_since", String(input.updated_since));
    }
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await harvestFetch(
      ctx.fetch,
      "listTimeEntries",
      url.toString(),
      { method: "GET" },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
