#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    title: z.string().describe("Lead title."),
    person_id: z
      .number()
      .int()
      .describe(
        "Linked person id. At least one of person_id or organization_id is required.",
      )
      .optional(),
    organization_id: z
      .number()
      .int()
      .describe(
        "Linked organization id. At least one of person_id or organization_id is required.",
      )
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Owning user id. From listUsers.")
      .optional(),
    value: z
      .object({
        amount: z.number().describe("Amount.").optional(),
        currency: z.string().describe("3-letter ISO currency code.").optional(),
      })
      .strict()
      .describe(
        "Monetary value as { amount, currency } (nested — not the flat deal value/currency).",
      )
      .optional(),
    label_ids: z
      .array(z.string())
      .describe("Lead label ids (string ids).")
      .optional(),
    expected_close_date: z
      .string()
      .date()
      .describe("Expected close date, YYYY-MM-DD.")
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.person_id === undefined && v.organization_id === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "At least one of person_id or organization_id is required.",
      });
    }
  });
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
  name: "createLead",
  title: "Create Lead",
  description:
    "Create a lead (an unqualified, pre-deal opportunity). Requires a title and at least one of person_id or organization_id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/v1/leads`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    if (input.organization_id !== undefined)
      body["organization_id"] = input.organization_id;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.value !== undefined) body["value"] = input.value;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    if (input.expected_close_date !== undefined)
      body["expected_close_date"] = input.expected_close_date;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("createLead", res);
    const rec = { ...(wire.data as Record<string, unknown>) };
    if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
    return rec;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
