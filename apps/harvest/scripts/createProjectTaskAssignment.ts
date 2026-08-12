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
      .describe("Project to assign the task to. From listProjects."),
    task_id: z.number().int().describe("Task to assign. From listTasks."),
    is_active: z
      .boolean()
      .describe("Active vs archived. Defaults to true.")
      .optional(),
    billable: z
      .boolean()
      .describe(
        "Whether time on this task and project is billable. Defaults to false.",
      )
      .optional(),
    hourly_rate: z
      .number()
      .describe("Rate used when the project's bill_by is Tasks.")
      .optional(),
    budget: z
      .number()
      .describe("Budget when the project's budget_by is task or task_fees.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Task assignment id."),
  billable: z
    .boolean()
    .describe("Whether time on this task and project is billable."),
  is_active: z.boolean().describe("Active vs archived."),
  hourly_rate: z
    .union([
      z.number().describe("Rate used when the project's bill_by is Tasks."),
      z.null().describe("Rate used when the project's bill_by is Tasks."),
    ])
    .describe("Rate used when the project's bill_by is Tasks.")
    .optional(),
  budget: z
    .union([
      z
        .number()
        .describe("Budget when the project's budget_by is task or task_fees."),
      z
        .null()
        .describe("Budget when the project's budget_by is task or task_fees."),
    ])
    .describe("Budget when the project's budget_by is task or task_fees.")
    .optional(),
  project: z
    .object({
      id: z.number().int().describe("Project id."),
      name: z.string().describe("Project name."),
      code: z.string().nullable().describe("Short project code.").optional(),
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
});

const definition = defineTool({
  name: "createProjectTaskAssignment",
  title: "Create Project Task Assignment",
  description:
    "Assign a task to a project. Governs how time on that task bills for the project. Use listTasks for task_id and listProjects for project_id.",
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
    const url = `https://api.harvestapp.com/v2/projects/${encodeURIComponent(input.project_id)}/task_assignments`;
    const body: Record<string, unknown> = {};
    if (input.task_id !== undefined) body["task_id"] = input.task_id;
    if (input.is_active !== undefined) body["is_active"] = input.is_active;
    if (input.billable !== undefined) body["billable"] = input.billable;
    if (input.hourly_rate !== undefined)
      body["hourly_rate"] = input.hourly_rate;
    if (input.budget !== undefined) body["budget"] = input.budget;
    const res = await harvestFetch(
      ctx.fetch,
      "createProjectTaskAssignment",
      url,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
