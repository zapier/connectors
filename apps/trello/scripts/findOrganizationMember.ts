#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ query: z.string(), organizationId: z.string().optional() })
  .strict();
const itemSchema = z.array(
  z.object({
    id: z
      .string()
      .regex(new RegExp("^[0-9a-fA-F]{24}$"))
      .describe("Trello object id (24 hex chars)."),
    username: z.string(),
    fullName: z.string().nullable().optional(),
    initials: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    email: z
      .string()
      .nullable()
      .describe("Present only when token has account read scope.")
      .optional(),
  }),
);
const outputSchema = z.object({ items: itemSchema });

const definition = defineTool({
  name: "findOrganizationMember",
  title: "Find Organization Member",
  description:
    "Find members in a workspace. Wire GET /search with modelTypes=members.",
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
    const url = new URL(`https://api.trello.com/1/_agent/search/members`);
    if (input.query !== undefined) {
      url.searchParams.set("query", String(input.query));
    }
    if (input.organizationId !== undefined) {
      url.searchParams.set("organizationId", String(input.organizationId));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Trello findOrganizationMember ${res.status}: ${errBody}`,
      );
    }
    const data = await res.json();
    return { items: data };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
