#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        "Raw Trello query string (e.g. board:MyBoard @me due:week). Mutually exclusive with keyword-based structured search.",
      )
      .optional(),
    keyword: z
      .string()
      .describe("Search card name/description when not using raw query.")
      .optional(),
    boardId: z.string().describe("Limit to this board id.").optional(),
    listName: z.string().optional(),
    member: z
      .string()
      .describe("Member filter; use @me for current user.")
      .optional(),
    label: z.string().optional(),
    dueFilter: z
      .enum(["day", "week", "month", "overdue", "complete", "incomplete"])
      .optional(),
    organizationId: z.string().optional(),
    cardsLimit: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    partial: z.boolean().default(true),
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
        idLabels: z.array(z.string()).nullable().optional(),
        idMembers: z.array(z.string()).nullable().optional(),
        labels: z
          .array(
            z.object({
              id: z.string(),
              name: z.string().nullable().optional(),
              color: z.string().nullable().optional(),
            }),
          )
          .nullable()
          .optional(),
        pos: z.number().nullable().optional(),
        customFields: z.record(z.string(), z.json()).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "searchCards",
  title: "Search Cards",
  description: "Search for cards using Trello query DSL or structured filters.",
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
    const url = new URL(`https://api.trello.com/1/search`);
    if (input.query !== undefined) {
      url.searchParams.set("query", String(input.query));
    }
    if (input.keyword !== undefined) {
      url.searchParams.set("keyword", String(input.keyword));
    }
    if (input.boardId !== undefined) {
      url.searchParams.set("boardId", String(input.boardId));
    }
    if (input.listName !== undefined) {
      url.searchParams.set("listName", String(input.listName));
    }
    if (input.member !== undefined) {
      url.searchParams.set("member", String(input.member));
    }
    if (input.label !== undefined) {
      url.searchParams.set("label", String(input.label));
    }
    if (input.dueFilter !== undefined) {
      url.searchParams.set("dueFilter", String(input.dueFilter));
    }
    if (input.organizationId !== undefined) {
      url.searchParams.set("organizationId", String(input.organizationId));
    }
    url.searchParams.set("cardsLimit", String(input.cardsLimit ?? 20));
    if (input.partial !== undefined) {
      url.searchParams.set("partial", String(input.partial));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello searchCards ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
