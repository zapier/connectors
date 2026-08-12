#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  id: z.number().int().describe("User id."),
  first_name: z.string().describe("First name."),
  last_name: z.string().describe("Last name."),
  email: z.string().describe("Email address."),
  timezone: z.string().nullable().describe("The user's timezone.").optional(),
  is_active: z.boolean().describe("Active vs archived."),
  is_contractor: z
    .boolean()
    .nullable()
    .describe("Whether the user is a contractor.")
    .optional(),
  weekly_capacity: z
    .number()
    .int()
    .nullable()
    .describe("Weekly capacity in seconds.")
    .optional(),
  default_hourly_rate: z
    .number()
    .nullable()
    .describe("The user's default billable rate.")
    .optional(),
  cost_rate: z
    .number()
    .nullable()
    .describe("The user's internal cost rate.")
    .optional(),
  roles: z
    .array(z.string())
    .nullable()
    .describe("The user's display roles.")
    .optional(),
  access_roles: z
    .array(z.string())
    .nullable()
    .describe(
      "The user's permission roles (e.g. administrator, manager, member).",
    )
    .optional(),
});

const definition = defineTool({
  name: "getCurrentUser",
  title: "Get Current User",
  description:
    "Retrieve the authenticated user's identity, timezone, roles, and default rates. The default resolver for user_id on time-entry tools.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (_input, ctx) => {
    const url = `https://api.harvestapp.com/v2/users/me`;
    const res = await harvestFetch(ctx.fetch, "getCurrentUser", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
