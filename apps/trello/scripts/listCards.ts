#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex board id."),
    filter: z
      .enum(["all", "closed", "none", "open", "visible"])
      .default("open"),
    before: z
      .string()
      .describe("Return cards older than this card id (cursor for next page).")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z
          .string()
          .regex(new RegExp("^[0-9a-fA-F]{24}$"))
          .describe("Trello object id (24 hex chars)."),
        name: z.string(),
        desc: z.string().nullable().optional(),
        closed: z.boolean().nullable().optional(),
        idBoard: z.string(),
        idList: z.string(),
        idShort: z.number().int().nullable().optional(),
        shortLink: z.string().nullable().optional(),
        shortUrl: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        due: z
          .union([z.string().datetime({ offset: true }), z.null()])
          .optional(),
        dueComplete: z.boolean().nullable().optional(),
        dateLastActivity: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional(),
        idLabels: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        idMembers: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        labels: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        pos: z.number().nullable().optional(),
        customFields: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .optional(),
  has_more: z
    .boolean()
    .nullable()
    .describe(
      "True when the page is full and before-cursor paging may return more.",
    )
    .optional(),
});

const definition = defineTool({
  name: "listCards",
  title: "List Cards",
  description:
    "List cards on a board with optional filter and before-cursor pagination.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = new URL(
      `https://api.trello.com/1/boards/${encodeURIComponent(input.id)}/cards`,
    );
    if (input.filter !== undefined) {
      url.searchParams.set("filter", String(input.filter));
    }
    if (input.before !== undefined) {
      url.searchParams.set("before", String(input.before));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello listCards ${res.status}: ${errBody}`);
    }
    const limit = input.limit ?? 20;
    const cards = (await res.json()) as unknown[];
    const items = Array.isArray(cards) ? cards : [];
    return { items, has_more: items.length >= limit };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
