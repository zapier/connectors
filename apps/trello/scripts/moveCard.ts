#!/usr/bin/env node
// Authored by the implementation agent: thin intent wrapper over PUT /cards/{id} (idList/idBoard).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  TRELLO_BASE,
  TRELLO_ID_REGEX,
  trelloError,
  trelloFormBody,
  trelloFormHeaders,
} from "../lib/trello.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id to move."),
    idList: z
      .string()
      .describe("Destination list id. Resolve via listLists or findList."),
    idBoard: z
      .string()
      .describe("Destination board id when moving across boards.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string().regex(TRELLO_ID_REGEX),
  name: z.string(),
  closed: z.boolean().nullable().optional(),
  idBoard: z.string(),
  idList: z.string(),
  url: z.string(),
  shortUrl: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "moveCard",
  title: "Move Card",
  description:
    "Move a card to another list (and optionally another board). Resolve list ids via listLists or findList before calling.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `${TRELLO_BASE}/cards/${encodeURIComponent(input.id)}`;
    const body: Record<string, string> = { idList: input.idList };
    if (input.idBoard !== undefined) body.idBoard = input.idBoard;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: trelloFormHeaders,
      body: trelloFormBody(body),
    });
    if (!res.ok) await trelloError("moveCard", res);
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
