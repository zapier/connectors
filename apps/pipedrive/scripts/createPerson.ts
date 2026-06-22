#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    name: z.string().describe("Full name."),
    owner_id: z
      .number()
      .int()
      .describe("Owning user id. From listUsers.")
      .optional(),
    org_id: z
      .number()
      .int()
      .describe("Linked organization id. From searchOrganizations.")
      .optional(),
    emails: z
      .array(
        z
          .object({
            value: z.string().describe("The email address.").optional(),
            label: z
              .string()
              .describe("Label such as work or home.")
              .optional(),
            primary: z
              .boolean()
              .describe("Mark as the primary email.")
              .optional(),
          })
          .strict(),
      )
      .describe("Email addresses.")
      .optional(),
    phones: z
      .array(
        z
          .object({
            value: z.string().describe("The phone number.").optional(),
            label: z
              .string()
              .describe("Label such as work or mobile.")
              .optional(),
            primary: z
              .boolean()
              .describe("Mark as the primary phone.")
              .optional(),
          })
          .strict(),
      )
      .describe("Phone numbers.")
      .optional(),
    label_ids: z
      .array(z.number().int())
      .describe("Person label ids.")
      .optional(),
    visible_to: z
      .string()
      .describe(
        "Visibility level (account-dependent, e.g. 1 owner / 3 whole company).",
      )
      .optional(),
    custom_fields: z
      .record(z.string(), z.json())
      .describe(
        "Account custom fields keyed by 40-char hash. Discover keys and option ids via listPersonFields.",
      )
      .optional(),
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
  name: "createPerson",
  title: "Create Person",
  description:
    "Create a person (a contact). Only name is required; attach an organization, emails, phones, and labels as needed.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/persons`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.org_id !== undefined) body["org_id"] = input.org_id;
    if (input.emails !== undefined) body["emails"] = input.emails;
    if (input.phones !== undefined) body["phones"] = input.phones;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    if (input.visible_to !== undefined) body["visible_to"] = input.visible_to;
    if (input.custom_fields !== undefined)
      body["custom_fields"] = input.custom_fields;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("createPerson", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
