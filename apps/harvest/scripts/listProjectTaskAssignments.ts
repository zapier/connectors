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
      .describe("Project whose task assignments to list. From listProjects."),
    is_active: z.boolean().describe("true for active only.").optional(),
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
  task_assignments: z.array(
    z.object({
      id: z.number().int().describe("Task assignment id."),
      billable: z
        .boolean()
        .describe("Whether time on this task and project is billable."),
      is_active: z.boolean().describe("Active vs archived."),
      hourly_rate: z
        .number()
        .nullable()
        .describe("Rate used when the project's bill_by is Tasks.")
        .optional(),
      budget: z
        .number()
        .nullable()
        .describe("Budget when the project's budget_by is task or task_fees.")
        .optional(),
      project: z
        .object({
          id: z.number().int().describe("Project id."),
          name: z.string().describe("Project name."),
          code: z
            .string()
            .nullable()
            .describe("Short project code.")
            .optional(),
        })
        .nullable()
        .describe("The project this task is assigned to.")
        .optional(),
      task: z
        .object({
          id: z.number().int().describe("Task id."),
          name: z.string().describe("Task name."),
        })
        .nullable()
        .describe("The assigned task.")
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
  name: "listProjectTaskAssignments",
  title: "List Project Task Assignments",
  description:
    "List a project's task assignments — the tasks set up on the project and how each bills. Use this to resolve a task_id for a time entry on the project.",
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
    const url = new URL(
      `https://api.harvestapp.com/v2/projects/${encodeURIComponent(input.project_id)}/task_assignments`,
    );
    if (input.is_active !== undefined) {
      url.searchParams.set("is_active", String(input.is_active));
    }
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await harvestFetch(
      ctx.fetch,
      "listProjectTaskAssignments",
      url.toString(),
      {
        method: "GET",
      },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
