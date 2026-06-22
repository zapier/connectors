#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.string().uuid().describe("Lead id (UUID) to update."),
    title: z.string().describe("New title.").optional(),
    owner_id: z
      .number()
      .int()
      .describe("Reassign owner. From listUsers.")
      .optional(),
    person_id: z.number().int().describe("Re-link person.").optional(),
    organization_id: z
      .number()
      .int()
      .describe("Re-link organization.")
      .optional(),
    value: z
      .object({
        amount: z.number().describe("Amount.").optional(),
        currency: z.string().describe("3-letter ISO currency code.").optional(),
      })
      .strict()
      .describe("Monetary value as { amount, currency }.")
      .optional(),
    label_ids: z
      .array(z.string())
      .describe("Replace lead labels (string ids).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().uuid().describe("Lead id (UUID)."),
  title: z.string().describe("Lead title."),
  owner_id: z.number().int().describe("Owning user id.").nullish(),
  person_id: z
    .union([
      z.number().int().describe("Linked person id."),
      z.null().describe("Linked person id."),
    ])
    .describe("Linked person id.")
    .nullish(),
  organization_id: z
    .union([
      z.number().int().describe("Linked organization id."),
      z.null().describe("Linked organization id."),
    ])
    .describe("Linked organization id.")
    .nullish(),
  value: z
    .union([
      z
        .object({
          amount: z.number().describe("Amount.").nullish(),
          currency: z
            .string()
            .describe("3-letter ISO currency code.")
            .nullish(),
        })
        .describe(
          "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
        ),
      z
        .null()
        .describe(
          "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
        ),
    ])
    .describe(
      "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
    )
    .nullish(),
  label_ids: z
    .array(z.string())
    .describe("Lead label ids (string ids).")
    .nullish(),
  expected_close_date: z
    .union([
      z.string().date().describe("Expected close date, YYYY-MM-DD."),
      z.null().describe("Expected close date, YYYY-MM-DD."),
    ])
    .describe("Expected close date, YYYY-MM-DD.")
    .nullish(),
  add_time: z
    .string()
    .datetime({ offset: true })
    .describe("Creation time, RFC 3339."),
});

const definition = defineTool({
  name: "updateLead",
  title: "Update Lead",
  description:
    "Update a lead — retitle, re-link a person/organization, re-value, or relabel. Only supplied fields change.",
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
    const url = `https://api.pipedrive.com/v1/leads/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    if (input.organization_id !== undefined)
      body["organization_id"] = input.organization_id;
    if (input.value !== undefined) body["value"] = input.value;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateLead", res);
    const rec = { ...(wire.data as Record<string, unknown>) };
    if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
    return rec;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
