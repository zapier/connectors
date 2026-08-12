#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Project id. From listProjects."),
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
  name: "getProject",
  title: "Get Project",
  description:
    "Retrieve one project's full budget and rate detail. From listProjects.",
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
    const url = `https://api.harvestapp.com/v2/projects/${encodeURIComponent(input.id)}`;
    const res = await harvestFetch(ctx.fetch, "getProject", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
