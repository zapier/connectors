#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    is_active: z
      .boolean()
      .describe("true for active only, false for archived only.")
      .optional(),
    updated_since: z
      .string()
      .describe("Only users updated on/after this ISO 8601 timestamp.")
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
  users: z.array(
    z.object({
      id: z.number().int().describe("User id."),
      first_name: z.string().describe("First name."),
      last_name: z.string().describe("Last name."),
      email: z.string().describe("Email address."),
      timezone: z
        .string()
        .nullable()
        .describe("The user's timezone.")
        .optional(),
      is_active: z.boolean().describe("Active vs archived."),
      is_contractor: z
        .boolean()
        .nullable()
        .describe("Whether the user is a contractor.")
        .optional(),
      weekly_capacity: z
        .number()
        .int()
        .nullable()
        .describe("Weekly capacity in seconds.")
        .optional(),
      default_hourly_rate: z
        .number()
        .nullable()
        .describe("The user's default billable rate.")
        .optional(),
      cost_rate: z
        .number()
        .nullable()
        .describe("The user's internal cost rate.")
        .optional(),
      roles: z
        .array(z.string())
        .nullable()
        .describe("The user's display roles.")
        .optional(),
      access_roles: z
        .array(z.string())
        .nullable()
        .describe(
          "The user's permission roles (e.g. administrator, manager, member).",
        )
        .optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listUsers",
  title: "List Users",
  description:
    "List users, to log or read time on behalf of a specific teammate. Read-only; user administration is out of scope.",
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
    const url = new URL(`https://api.harvestapp.com/v2/users`);
    if (input.is_active !== undefined) {
      url.searchParams.set("is_active", String(input.is_active));
    }
    if (input.updated_since !== undefined) {
      url.searchParams.set("updated_since", String(input.updated_since));
    }
    if (input.page !== undefined) {
      url.searchParams.set("page", String(input.page));
    }
    url.searchParams.set("per_page", String(input.per_page ?? 20));
    const res = await harvestFetch(ctx.fetch, "listUsers", url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
