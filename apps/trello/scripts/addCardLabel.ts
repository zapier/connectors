#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    value: z.string().describe("Label id from listLabels."),
  })
  .strict();
const outputSchema = z.object({
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
  due: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  dueComplete: z.boolean().nullable().optional(),
  dateLastActivity: z.string().datetime({ offset: true }).nullable().optional(),
  idLabels: z.array(z.string()).nullable().optional(),
  idMembers: z.array(z.string()).nullable().optional(),
  labels: z
    .array(
      z.object({
        id: z
          .string()
          .regex(new RegExp("^[0-9a-fA-F]{24}$"))
          .describe("Trello object id (24 hex chars)."),
        idBoard: z.string(),
        name: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  pos: z.number().nullable().optional(),
  customFields: z
    .record(z.string(), z.any())
    .nullable()
    .describe("Custom field values keyed by field name when requested.")
    .optional(),
});

const definition = defineTool({
  name: "addCardLabel",
  title: "Add Card Label",
  description: "Add an existing board label to a card by label id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}/idLabels`;
    const body: Record<string, unknown> = {};
    if (input.value !== undefined) body["value"] = input.value;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello addCardLabel ${res.status}: ${errBody}`);
    }
    const cardRes = await ctx.fetch(
      `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}`,
    );
    if (!cardRes.ok) {
      const errBody = await cardRes.text();
      throw new Error(`Trello addCardLabel ${cardRes.status}: ${errBody}`);
    }
    return cardRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
