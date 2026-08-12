#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    client_id: z
      .number()
      .int()
      .describe("Client the contact belongs to. From listClients."),
    first_name: z.string().describe("Contact first name."),
    last_name: z.string().describe("Contact last name.").optional(),
    title: z.string().describe('Contact title, e.g. "Owner".').optional(),
    email: z.string().describe("Email address.").optional(),
    phone_office: z.string().describe("Office phone.").optional(),
    phone_mobile: z.string().describe("Mobile phone.").optional(),
    fax: z.string().describe("Fax.").optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Contact id."),
  title: z
    .union([
      z.string().describe("Contact title."),
      z.null().describe("Contact title."),
    ])
    .describe("Contact title.")
    .optional(),
  first_name: z.string().describe("First name."),
  last_name: z
    .union([z.string().describe("Last name."), z.null().describe("Last name.")])
    .describe("Last name.")
    .optional(),
  email: z.string().nullable().describe("Email address.").optional(),
  phone_office: z.string().nullable().describe("Office phone.").optional(),
  phone_mobile: z.string().nullable().describe("Mobile phone.").optional(),
  fax: z.string().nullable().describe("Fax.").optional(),
  client: z
    .object({
      id: z.number().int().describe("Client id."),
      name: z.string().describe("Client name."),
    })
    .nullable()
    .describe("A lightweight id + name reference to a related resource.")
    .optional(),
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
  name: "createContact",
  title: "Create Contact",
  description:
    "Create a client contact. client_id and first_name are required.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/contacts`;
    const body: Record<string, unknown> = {};
    if (input.client_id !== undefined) body["client_id"] = input.client_id;
    if (input.first_name !== undefined) body["first_name"] = input.first_name;
    if (input.last_name !== undefined) body["last_name"] = input.last_name;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.email !== undefined) body["email"] = input.email;
    if (input.phone_office !== undefined)
      body["phone_office"] = input.phone_office;
    if (input.phone_mobile !== undefined)
      body["phone_mobile"] = input.phone_mobile;
    if (input.fax !== undefined) body["fax"] = input.fax;
    const res = await harvestFetch(ctx.fetch, "createContact", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
