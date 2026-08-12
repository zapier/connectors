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
      .describe("Only contacts for this client. From listClients.")
      .optional(),
    updated_since: z
      .string()
      .describe("Only contacts updated on/after this ISO 8601 timestamp.")
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
  contacts: z.array(
    z.object({
      id: z.number().int().describe("Contact id."),
      title: z.string().nullable().describe("Contact title.").optional(),
      first_name: z.string().describe("First name."),
      last_name: z.string().nullable().describe("Last name.").optional(),
      email: z.string().nullable().describe("Email address.").optional(),
      phone_office: z.string().nullable().describe("Office phone.").optional(),
      phone_mobile: z.string().nullable().describe("Mobile phone.").optional(),
      fax: z.string().nullable().describe("Fax.").optional(),
      client: z
        .object({
          id: z.number().int().describe("Client id."),
          name: z.string().describe("Client name."),
        })
        .nullable()
        .describe("The client this contact belongs to.")
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
    }),
  ),
});

const definition = defineTool({
  name: "listContacts",
  title: "List Contacts",
  description:
    "List client contacts, optionally filtered by client. Source of contact ids.",
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
    const url = new URL(`https://api.harvestapp.com/v2/contacts`);
    if (input.client_id !== undefined) {
      url.searchParams.set("client_id", String(input.client_id));
    }
    if (input.updated_since !== undefined) {
      url.searchParams.set("updated_since", String(input.updated_since));
    }
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await harvestFetch(ctx.fetch, "listContacts", url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
