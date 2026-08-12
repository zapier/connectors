#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Project to update. From listProjects."),
    name: z.string().describe("New name.").optional(),
    code: z.string().describe("New code.").optional(),
    is_active: z
      .boolean()
      .describe("Set false to archive, true to reactivate.")
      .optional(),
    is_billable: z.boolean().describe("Toggle billable.").optional(),
    bill_by: z
      .enum(["Project", "Tasks", "People", "none"])
      .describe("How the project is invoiced.")
      .optional(),
    budget_by: z
      .enum(["project", "project_cost", "task", "task_fees", "person", "none"])
      .describe("How the project is budgeted.")
      .optional(),
    hourly_rate: z
      .number()
      .describe(
        "Project hourly rate. In the account's currency — omitting it uses the Harvest account default. To choose a non-default currency or read the current default, call getCompany first.",
      )
      .optional(),
    budget: z
      .number()
      .describe(
        "Budget in hours when budgeting by time. When budgeting by money (budget_by project_cost/task_fees), the amount is in the account's currency — omitting it uses the Harvest account default. To choose a non-default currency or read the current default, call getCompany first.",
      )
      .optional(),
    notes: z.string().describe("Project notes.").optional(),
    starts_on: z.string().date().describe("Start date, YYYY-MM-DD.").optional(),
    ends_on: z.string().date().describe("End date, YYYY-MM-DD.").optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Project id."),
  name: z.string().describe("Project name."),
  code: z
    .union([
      z.string().describe("Short project code."),
      z.null().describe("Short project code."),
    ])
    .describe("Short project code.")
    .optional(),
  is_active: z.boolean().describe("Active vs archived."),
  is_billable: z.boolean().describe("Whether the project is billable."),
  is_fixed_fee: z
    .boolean()
    .nullable()
    .describe("Whether the project is fixed-fee.")
    .optional(),
  bill_by: z
    .string()
    .describe("How the project is invoiced (Project, Tasks, People, none)."),
  budget_by: z.string().describe("How the project is budgeted."),
  budget: z
    .union([
      z.number().describe("Budget in hours (time-budgeted projects)."),
      z.null().describe("Budget in hours (time-budgeted projects)."),
    ])
    .describe("Budget in hours (time-budgeted projects).")
    .optional(),
  cost_budget: z
    .union([
      z.number().describe("Monetary budget (money-budgeted projects)."),
      z.null().describe("Monetary budget (money-budgeted projects)."),
    ])
    .describe("Monetary budget (money-budgeted projects).")
    .optional(),
  hourly_rate: z
    .union([
      z.number().describe("Project hourly rate."),
      z.null().describe("Project hourly rate."),
    ])
    .describe("Project hourly rate.")
    .optional(),
  fee: z
    .union([
      z.number().describe("Fixed fee (fixed-fee projects)."),
      z.null().describe("Fixed fee (fixed-fee projects)."),
    ])
    .describe("Fixed fee (fixed-fee projects).")
    .optional(),
  notes: z.string().nullable().describe("Project notes.").optional(),
  starts_on: z
    .union([
      z.string().date().describe("Start date, YYYY-MM-DD."),
      z.null().describe("Start date, YYYY-MM-DD."),
    ])
    .describe("Start date, YYYY-MM-DD.")
    .optional(),
  ends_on: z
    .union([
      z.string().date().describe("End date, YYYY-MM-DD."),
      z.null().describe("End date, YYYY-MM-DD."),
    ])
    .describe("End date, YYYY-MM-DD.")
    .optional(),
  client: z
    .object({
      id: z.number().int().describe("Client id."),
      name: z.string().describe("Client name."),
      currency: z
        .string()
        .nullable()
        .describe("Client currency (ISO code).")
        .optional(),
    })
    .nullable()
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
  name: "updateProject",
  title: "Update Project",
  description:
    "Update a project. Only the fields you pass change. Set is_active false to archive (there is no project delete).",
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
    const url = `https://api.harvestapp.com/v2/projects/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.code !== undefined) body["code"] = input.code;
    if (input.is_active !== undefined) body["is_active"] = input.is_active;
    if (input.is_billable !== undefined)
      body["is_billable"] = input.is_billable;
    if (input.bill_by !== undefined) body["bill_by"] = input.bill_by;
    if (input.budget_by !== undefined) body["budget_by"] = input.budget_by;
    if (input.hourly_rate !== undefined)
      body["hourly_rate"] = input.hourly_rate;
    if (input.budget !== undefined) body["budget"] = input.budget;
    if (input.notes !== undefined) body["notes"] = input.notes;
    if (input.starts_on !== undefined) body["starts_on"] = input.starts_on;
    if (input.ends_on !== undefined) body["ends_on"] = input.ends_on;
    const res = await harvestFetch(ctx.fetch, "updateProject", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
