#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { TRELLO_BASE, trelloError } from "../lib/trello.ts";

function buildSearchQuery(input: {
  query?: string;
  keyword?: string;
  listName?: string;
  member?: string;
  label?: string;
  dueFilter?: string;
}): string {
  if (input.query !== undefined) return input.query;
  const parts: string[] = [];
  if (input.keyword !== undefined) parts.push(input.keyword);
  if (input.listName !== undefined) parts.push(`list:${input.listName}`);
  if (input.member !== undefined) {
    parts.push(
      input.member.startsWith("@") ? input.member : `@${input.member}`,
    );
  }
  if (input.label !== undefined) parts.push(`label:${input.label}`);
  if (input.dueFilter !== undefined) parts.push(`due:${input.dueFilter}`);
  if (parts.length === 0) {
    throw new Error("Trello searchCards: provide query or keyword.");
  }
  return parts.join(" ");
}

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
    const url = new URL(`${TRELLO_BASE}/search`);
    url.searchParams.set("query", buildSearchQuery(input));
    url.searchParams.set("modelTypes", "cards");
    if (input.boardId !== undefined) {
      url.searchParams.set("idBoards", input.boardId);
    }
    if (input.organizationId !== undefined) {
      url.searchParams.set("idOrganizations", input.organizationId);
    }
    const limit = input.cardsLimit ?? 20;
    url.searchParams.set("cards_limit", String(limit));
    if (input.partial !== undefined) {
      url.searchParams.set("partial", String(input.partial));
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    if (!res.ok) await trelloError("searchCards", res);
    const data = (await res.json()) as { cards?: unknown[] };
    const items = Array.isArray(data.cards) ? data.cards : [];
    return { items, has_more: items.length >= limit };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
