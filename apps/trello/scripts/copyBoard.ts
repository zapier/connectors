#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex board id."),
    name: z.string().describe("Name for the copy.").optional(),
    idOrganization: z.string().describe("Destination workspace id.").optional(),
    keepFromSource: z
      .string()
      .describe("Comma-separated props to keep, e.g. cards,labels.")
      .optional(),
    idBoardSource: z
      .string()
      .describe(
        "Source board id (wire name idBoardSource; same as path id when omitted).",
      )
      .optional(),
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
  idOrganization: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  shortUrl: z.string().nullable().optional(),
  dateLastActivity: z.string().datetime({ offset: true }).nullable().optional(),
});

const definition = defineTool({
  name: "copyBoard",
  title: "Copy Board",
  description:
    "Copy an existing board, optionally keeping cards and changing the destination workspace.",
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
    const url = `https://api.trello.com/1/boards/${encodeURIComponent(input.id)}/copy`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.idOrganization !== undefined)
      body["idOrganization"] = input.idOrganization;
    if (input.keepFromSource !== undefined)
      body["keepFromSource"] = input.keepFromSource;
    if (input.idBoardSource !== undefined)
      body["idBoardSource"] = input.idBoardSource;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello copyBoard ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
