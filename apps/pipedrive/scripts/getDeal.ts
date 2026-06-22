#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Deal id. From searchDeals or listDeals."),
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
  name: "getDeal",
  title: "Get Deal",
  description:
    "Fetch one deal by id with full detail, including custom fields.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("getDeal", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
