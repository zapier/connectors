#!/usr/bin/env node
// Authored by the implementation agent: thin intent wrapper over PUT /cards/{id} (closed=true).
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
    id: z.string().describe("24-char hex card id to archive."),
    closed: z
      .boolean()
      .default(true)
      .describe("Archive when true (default); set false to reopen."),
  })
  .strict();

const outputSchema = z.object({
  id: z.string().regex(TRELLO_ID_REGEX),
  name: z.string(),
  closed: z.boolean(),
  idBoard: z.string(),
  idList: z.string(),
  url: z.string(),
  shortUrl: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "archiveCard",
  title: "Archive Card",
  description:
    "Archive (close) a card by id. Prefer this over updateCard when the job is only archiving. Reopen with closed=false.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `${TRELLO_BASE}/cards/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: trelloFormHeaders,
      body: trelloFormBody({ closed: input.closed }),
    });
    if (!res.ok) await trelloError("archiveCard", res);
    const card = (await res.json()) as z.infer<typeof outputSchema>;
    if (input.closed && card.closed) {
      return card;
    }
    return card;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
