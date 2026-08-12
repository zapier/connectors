#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    name: z.string().describe('Task name, e.g. "Programming".'),
    billable_by_default: z
      .boolean()
      .describe(
        "Whether the task is billable when added to a project. Defaults to true.",
      )
      .optional(),
    default_hourly_rate: z
      .number()
      .describe("Default hourly rate when added to a project. Defaults to 0.")
      .optional(),
    is_default: z
      .boolean()
      .describe("Auto-add this task to future projects. Defaults to false.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Task id."),
  name: z.string().describe("Task name."),
  billable_by_default: z
    .boolean()
    .nullable()
    .describe("Whether the task is billable when added to a project.")
    .optional(),
  default_hourly_rate: z
    .number()
    .nullable()
    .describe("Default hourly rate when added to a project.")
    .optional(),
  is_default: z
    .boolean()
    .nullable()
    .describe("Whether the task is auto-added to future projects.")
    .optional(),
  is_active: z.boolean().describe("Active vs archived."),
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
  name: "createTask",
  title: "Create Task",
  description:
    "Create a task. name is required. A task is an account-wide object; a project references it through a project task assignment (createProjectTaskAssignment), which governs how time on that task bills for the project.",
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
    const url = `https://api.harvestapp.com/v2/tasks`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.billable_by_default !== undefined)
      body["billable_by_default"] = input.billable_by_default;
    if (input.default_hourly_rate !== undefined)
      body["default_hourly_rate"] = input.default_hourly_rate;
    if (input.is_default !== undefined) body["is_default"] = input.is_default;
    const res = await harvestFetch(ctx.fetch, "createTask", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
