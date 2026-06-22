#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Organization id to update."),
    name: z.string().describe("New name.").optional(),
    owner_id: z
      .number()
      .int()
      .describe("Reassign owner. From listUsers.")
      .optional(),
    label_ids: z.array(z.number().int()).describe("Replace labels.").optional(),
    custom_fields: z
      .record(z.string(), z.json())
      .describe(
        "Account custom fields keyed by 40-char hash. Discover via listOrganizationFields.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Organization id."),
  name: z.string().describe("Organization name."),
  owner_id: z.number().int().describe("Owning user id.").nullish(),
  label_ids: z
    .array(z.number().int())
    .describe("Organization label ids.")
    .nullish(),
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
      "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listOrganizationFields.",
    )
    .nullish(),
});

const definition = defineTool({
  name: "updateOrganization",
  title: "Update Organization",
  description:
    "Update an organization — rename, reassign owner, or set labels. Only supplied fields change.",
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
    const url = `https://api.pipedrive.com/api/v2/organizations/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.label_ids !== undefined) body["label_ids"] = input.label_ids;
    if (input.custom_fields !== undefined)
      body["custom_fields"] = input.custom_fields;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateOrganization", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
