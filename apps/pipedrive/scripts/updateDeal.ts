#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z
      .number()
      .int()
      .describe("Deal id to update. From searchDeals or listDeals."),
    title: z.string().describe("New title.").optional(),
    value: z.number().describe("New value. Pair with currency.").optional(),
    currency: z.string().describe("3-letter ISO code.").optional(),
    pipeline_id: z
      .number()
      .int()
      .describe("Move to pipeline. From listPipelines.")
      .optional(),
    stage_id: z
      .number()
      .int()
      .describe("Move to stage. From listStages.")
      .optional(),
    status: z.enum(["open", "won", "lost"]).describe("Deal status.").optional(),
    lost_reason: z
      .string()
      .describe("Reason text; meaningful only when status is lost.")
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Reassign owner. From listUsers.")
      .optional(),
    label_ids: z
      .array(z.number().int())
      .describe("Replace deal labels.")
      .optional(),
    expected_close_date: z
      .string()
      .date()
      .describe("Expected close date, YYYY-MM-DD.")
      .optional(),
    probability: z.number().describe("Win probability, 0-100.").optional(),
    custom_fields: z
      .record(z.string(), z.json())
      .describe(
        "Account custom fields keyed by 40-char hash. Discover via listDealFields. Send null to clear a field.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Deal id."),
  title: z.string().describe("Deal title."),
  value: z.number().describe("Monetary value.").nullish(),
  currency: z.string().describe("3-letter ISO currency code.").nullish(),
  status: z.string().describe("open, won, or lost.").nullish(),
  pipeline_id: z.number().int().describe("Pipeline this deal is in.").nullish(),
  stage_id: z.number().int().describe("Stage within the pipeline.").nullish(),
  person_id: z
    .union([
      z.number().int().describe("Linked person id."),
      z.null().describe("Linked person id."),
    ])
    .describe("Linked person id.")
    .nullish(),
  org_id: z
    .union([
      z.number().int().describe("Linked organization id."),
      z.null().describe("Linked organization id."),
    ])
    .describe("Linked organization id.")
    .nullish(),
  owner_id: z.number().int().describe("Owning user id.").nullish(),
  expected_close_date: z
    .union([
      z.string().date().describe("Expected close date, YYYY-MM-DD."),
      z.null().describe("Expected close date, YYYY-MM-DD."),
    ])
    .describe("Expected close date, YYYY-MM-DD.")
    .nullish(),
  probability: z
    .union([
      z.number().describe("Win probability 0-100."),
      z.null().describe("Win probability 0-100."),
    ])
    .describe("Win probability 0-100.")
    .nullish(),
  label_ids: z.array(z.number().int()).describe("Deal label ids.").nullish(),
  add_time: z
    .string()
    .datetime({ offset: true })
    .describe("Creation time, RFC 3339."),
  update_time: z
    .string()
    .datetime({ offset: true })
    .describe("Last update time, RFC 3339.")
    .nullish(),
  custom_fields: z
    .record(z.string(), z.json())
    .describe(
      "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listDealFields.",
    )
    .nullish(),
});

const definition = defineTool({
  name: "updateDeal",
  title: "Update Deal",
  description:
    "Update a deal — move its stage, change value, set labels, or close it as won/lost. Only supplied fields change.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.value !== undefined) body["value"] = input.value;
    if (input.currency !== undefined) body["currency"] = input.currency;
    if (input.pipeline_id !== undefined)
      body["pipeline_id"] = input.pipeline_id;
    if (input.stage_id !== undefined) body["stage_id"] = input.stage_id;
    if (input.status !== undefined) body["status"] = input.status;
    if (input.lost_reason !== undefined)
      body["lost_reason"] = input.lost_reason;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    if (input.expected_close_date !== undefined)
      body["expected_close_date"] = input.expected_close_date;
    if (input.probability !== undefined)
      body["probability"] = input.probability;
    if (input.custom_fields !== undefined)
      body["custom_fields"] = input.custom_fields;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateDeal", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
