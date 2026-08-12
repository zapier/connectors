#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    client_id: z
      .number()
      .int()
      .describe("Only invoices for this client. From listClients.")
      .optional(),
    updated_since: z
      .string()
      .describe("Only invoices updated on/after this ISO 8601 timestamp.")
      .optional(),
    from: z
      .string()
      .date()
      .describe("Earliest issue date, YYYY-MM-DD.")
      .optional(),
    to: z.string().date().describe("Latest issue date, YYYY-MM-DD.").optional(),
    state: z
      .enum(["draft", "open", "paid", "closed"])
      .describe("Filter by invoice state.")
      .optional(),
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
  invoices: z.array(
    z.object({
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
      due_amount: z
        .number()
        .nullable()
        .describe("Amount still owed.")
        .optional(),
      currency: z.string().describe("Invoice currency (ISO code)."),
      state: z
        .string()
        .describe("Invoice state (draft, open, paid, or closed)."),
      issue_date: z
        .string()
        .date()
        .nullable()
        .describe("Issue date, YYYY-MM-DD.")
        .optional(),
      due_date: z
        .string()
        .date()
        .nullable()
        .describe("Due date, YYYY-MM-DD.")
        .optional(),
      subject: z
        .string()
        .nullable()
        .describe("Invoice subject line.")
        .optional(),
      notes: z.string().nullable().describe("Invoice notes.").optional(),
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
  name: "listInvoices",
  title: "List Invoices",
  description:
    "List invoices, optionally filtered by client, state, or issue-date range.",
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
    const url = new URL(`https://api.harvestapp.com/v2/invoices`);
    if (input.client_id !== undefined) {
      url.searchParams.set("client_id", String(input.client_id));
    }
    if (input.updated_since !== undefined) {
      url.searchParams.set("updated_since", String(input.updated_since));
    }
    if (input.from !== undefined) {
      url.searchParams.set("from", String(input.from));
    }
    if (input.to !== undefined) {
      url.searchParams.set("to", String(input.to));
    }
    if (input.state !== undefined) {
      url.searchParams.set("state", String(input.state));
    }
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await harvestFetch(ctx.fetch, "listInvoices", url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
