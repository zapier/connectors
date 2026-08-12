#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Invoice id. From listInvoices."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Invoice id."),
  client: z
    .object({
      id: z.number().int().describe("Client id."),
      name: z.string().describe("Client name."),
    })
    .nullable()
    .describe("The client this invoice is billed to.")
    .optional(),
  number: z.string().describe("Human-facing invoice number."),
  amount: z.number().describe("Total invoice amount."),
  due_amount: z.number().nullable().describe("Amount still owed.").optional(),
  currency: z.string().describe("Invoice currency (ISO code)."),
  state: z.string().describe("Invoice state (draft, open, paid, or closed)."),
  issue_date: z
    .union([
      z.string().date().describe("Issue date, YYYY-MM-DD."),
      z.null().describe("Issue date, YYYY-MM-DD."),
    ])
    .describe("Issue date, YYYY-MM-DD.")
    .optional(),
  due_date: z
    .union([
      z.string().date().describe("Due date, YYYY-MM-DD."),
      z.null().describe("Due date, YYYY-MM-DD."),
    ])
    .describe("Due date, YYYY-MM-DD.")
    .optional(),
  subject: z
    .union([
      z.string().describe("Invoice subject line."),
      z.null().describe("Invoice subject line."),
    ])
    .describe("Invoice subject line.")
    .optional(),
  notes: z
    .union([
      z.string().describe("Invoice notes."),
      z.null().describe("Invoice notes."),
    ])
    .describe("Invoice notes.")
    .optional(),
  line_items: z
    .array(
      z.object({
        id: z.number().int().nullable().describe("Line item id.").optional(),
        kind: z.string().nullable().describe("Line item kind.").optional(),
        description: z
          .string()
          .nullable()
          .describe("Line item description.")
          .optional(),
        quantity: z.number().nullable().describe("Quantity.").optional(),
        unit_price: z.number().nullable().describe("Unit price.").optional(),
        amount: z.number().nullable().describe("Line amount.").optional(),
      }),
    )
    .nullable()
    .describe("Invoice line items (present on getInvoice).")
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
  name: "getInvoice",
  title: "Get Invoice",
  description:
    "Retrieve one invoice, including its line items. From listInvoices.",
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
    const url = `https://api.harvestapp.com/v2/invoices/${encodeURIComponent(input.id)}`;
    const res = await harvestFetch(ctx.fetch, "getInvoice", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
