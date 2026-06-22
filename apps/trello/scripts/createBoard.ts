#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    name: z.string().describe("Board name."),
    desc: z.string().describe("Board description.").optional(),
    idOrganization: z
      .string()
      .describe("Workspace (organization) id. Resolve via listOrganizations.")
      .optional(),
    defaultLists: z
      .boolean()
      .describe("Create default To Do / Doing / Done lists. Default true.")
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
  name: "createBoard",
  title: "Create Board",
  description: "Create a new Trello board in a workspace.",
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
    const url = `https://api.trello.com/1/boards`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.desc !== undefined) body["desc"] = input.desc;
    if (input.idOrganization !== undefined)
      body["idOrganization"] = input.idOrganization;
    if (input.defaultLists !== undefined)
      body["defaultLists"] = input.defaultLists;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello createBoard ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
