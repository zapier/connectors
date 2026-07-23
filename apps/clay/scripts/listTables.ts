#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    workspaceId: z.string().describe("Workspace id, from listWorkspaces."),
  })
  .strict();
const outputSchema = z.object({
  tables: z
    .array(
      z.object({
        id: z.string().describe("Table id."),
        name: z.string().nullable().describe("Table name.").optional(),
      }),
    )
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "listTables",
  title: "List Tables",
  description:
    "List tables in a workspace. Get workspaceId from listWorkspaces; pass a returned table id to getTable or a write tool.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = `https://api.clay.com/v3/workspaces/${encodeURIComponent(input.workspaceId)}/tables`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay listTables");
    // The /v3 list endpoint returns the rows under `results`; present them
    // under the agent-facing `tables` key.
    const payload = (await res.json()) as { results?: unknown[] };
    return { tables: payload.results ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
