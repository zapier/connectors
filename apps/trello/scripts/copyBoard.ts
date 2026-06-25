#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  TRELLO_BASE,
  trelloError,
  trelloFormBody,
  trelloFormHeaders,
} from "../lib/trello.ts";

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
    const fields: Record<string, string | number | boolean> = {
      idBoardSource: input.idBoardSource ?? input.id,
    };
    if (input.name !== undefined) fields.name = input.name;
    if (input.idOrganization !== undefined) {
      fields.idOrganization = input.idOrganization;
    }
    if (input.keepFromSource !== undefined) {
      fields.keepFromSource = input.keepFromSource;
    }
    const res = await ctx.fetch(`${TRELLO_BASE}/boards`, {
      method: "POST",
      headers: trelloFormHeaders,
      body: trelloFormBody(fields),
    });
    if (!res.ok) await trelloError("copyBoard", res);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
