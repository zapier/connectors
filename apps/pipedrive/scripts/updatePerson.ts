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
      .describe("Person id to update. From searchPersons or listPersons."),
    name: z.string().describe("New name.").optional(),
    owner_id: z
      .number()
      .int()
      .describe("Reassign owner. From listUsers.")
      .optional(),
    org_id: z.number().int().describe("Re-link organization.").optional(),
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
      .describe("Replaces the entire email set.")
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
      .describe("Replaces the entire phone set.")
      .optional(),
    label_ids: z
      .array(z.number().int())
      .describe("Replace person labels.")
      .optional(),
    custom_fields: z
      .record(z.string(), z.json())
      .describe(
        "Account custom fields keyed by 40-char hash. Discover via listPersonFields.",
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
  name: "updatePerson",
  title: "Update Person",
  description:
    "Update a person — rename, re-link organization, replace emails/phones, or set labels. Only supplied fields change.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/persons/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.org_id !== undefined) body["org_id"] = input.org_id;
    if (input.emails !== undefined) body["emails"] = input.emails;
    if (input.phones !== undefined) body["phones"] = input.phones;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    if (input.custom_fields !== undefined)
      body["custom_fields"] = input.custom_fields;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updatePerson", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
