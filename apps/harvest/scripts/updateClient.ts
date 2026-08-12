#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Client to update. From listClients."),
    name: z.string().describe("New name.").optional(),
    is_active: z
      .boolean()
      .describe("Set false to archive, true to reactivate.")
      .optional(),
    address: z.string().describe("New address.").optional(),
    currency: z
      .string()
      .describe(
        "ISO currency code (e.g. USD). Optional — omitting it uses the Harvest account default. To choose a non-default currency or read the current default, call getCompany first.",
      )
      .optional(),
  })
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
  name: "updateClient",
  title: "Update Client",
  description:
    "Update a client. Only the fields you pass change. Set is_active false to archive (there is no client delete).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/clients/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.is_active !== undefined) body["is_active"] = input.is_active;
    if (input.address !== undefined) body["address"] = input.address;
    if (input.currency !== undefined) body["currency"] = input.currency;
    const res = await harvestFetch(ctx.fetch, "updateClient", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
