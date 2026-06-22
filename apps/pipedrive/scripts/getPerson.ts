#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z
      .number()
      .int()
      .describe("Person id. From searchPersons or listPersons."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Person id."),
  name: z.string().describe("Full name."),
  owner_id: z.number().int().describe("Owning user id.").nullish(),
  org_id: z
    .union([
      z.number().int().describe("Linked organization id."),
      z.null().describe("Linked organization id."),
    ])
    .describe("Linked organization id.")
    .nullish(),
  emails: z
    .array(
      z.object({
        value: z.string().describe("The email address.").nullish(),
        label: z.string().describe("Label such as work or home.").nullish(),
        primary: z
          .boolean()
          .describe("Whether this is the primary email.")
          .nullish(),
      }),
    )
    .describe("Email addresses.")
    .nullish(),
  phones: z
    .array(
      z.object({
        value: z.string().describe("The phone number.").nullish(),
        label: z.string().describe("Label such as work or mobile.").nullish(),
        primary: z
          .boolean()
          .describe("Whether this is the primary phone.")
          .nullish(),
      }),
    )
    .describe("Phone numbers.")
    .nullish(),
  label_ids: z.array(z.number().int()).describe("Person label ids.").nullish(),
  add_time: z
    .string()
    .datetime({ offset: true })
    .describe("Creation time, RFC 3339."),
  update_time: z
    .string()
    .datetime({ offset: true })
    .describe("Last update time, RFC 3339.")
    .nullish(),
  custom_fields: z
    .record(z.string(), z.json())
    .describe(
      "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listPersonFields.",
    )
    .nullish(),
});

const definition = defineTool({
  name: "getPerson",
  title: "Get Person",
  description:
    "Fetch one person by id with full detail, including emails, phones, and custom fields.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/persons/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("getPerson", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
