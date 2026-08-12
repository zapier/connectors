#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({ id: z.number().int().describe("Client id. From listClients.") })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Client id."),
  name: z.string().describe("Client name."),
  is_active: z.boolean().describe("Active vs archived."),
  address: z
    .union([
      z.string().describe("Client postal address."),
      z.null().describe("Client postal address."),
    ])
    .describe("Client postal address.")
    .optional(),
  currency: z.string().describe("Client currency (ISO code)."),
  created_at: z
    .string()
    .nullable()
    .describe("Creation timestamp (ISO 8601).")
    .optional(),
  updated_at: z
    .string()
    .nullable()
    .describe("Last-update timestamp (ISO 8601).")
    .optional(),
});

const definition = defineTool({
  name: "getClient",
  title: "Get Client",
  description: "Retrieve one client by id. From listClients.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/clients/${encodeURIComponent(input.id)}`;
    const res = await harvestFetch(ctx.fetch, "getClient", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
