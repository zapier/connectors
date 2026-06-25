#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { TRELLO_BASE, trelloError } from "../lib/trello.ts";

const inputSchema = z
  .object({ query: z.string(), organizationId: z.string().optional() })
  .strict();
const itemSchema = z.array(
  z.object({
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
    dateLastActivity: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  }),
);
const outputSchema = z.object({ items: itemSchema });

const definition = defineTool({
  name: "findBoard",
  title: "Find Board",
  description: "Find boards by name via GET /search with modelTypes=boards.",
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
    url.searchParams.set("query", input.query);
    url.searchParams.set("modelTypes", "boards");
    url.searchParams.set("boardsLimit", "50");
    if (input.organizationId !== undefined) {
      url.searchParams.set("idOrganizations", input.organizationId);
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    if (!res.ok) await trelloError("findBoard", res);
    const data = (await res.json()) as { boards?: unknown[] };
    return { items: data.boards ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
