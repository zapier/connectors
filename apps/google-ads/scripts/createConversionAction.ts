#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { mutate, type MutateOperation } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    name: z
      .string()
      .describe("Conversion action name, unique within the account."),
    type: z
      .string()
      .describe(
        "Conversion action type, e.g. UPLOAD_CLICKS (offline-conversion setup), WEBPAGE, AD_CALL.",
      ),
    category: z
      .string()
      .describe(
        "Conversion category, e.g. DEFAULT, PURCHASE, LEAD, SIGNUP, PAGE_VIEW. Defaults to DEFAULT.",
      )
      .optional(),
    status: z
      .enum(["ENABLED", "REMOVED", "HIDDEN"])
      .describe("Initial status. Defaults to ENABLED.")
      .optional(),
    valueDefault: z
      .number()
      .describe(
        "Default value of a conversion in plain currency — NOT micros, unlike budgets and bids.",
      )
      .optional(),
    valueCurrencyCode: z
      .string()
      .describe("ISO 4217 currency code for the default value, e.g. USD.")
      .optional(),
    loginCustomerId: z
      .string()
      .describe(
        "Manager (MCC) account id, digits only. Required only when the operating account is reached through a manager account; omit for direct access.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  resource_name: z
    .string()
    .describe(
      "Resource name of the created conversion action, customers/{customerId}/conversionActions/{id}.",
    ),
});

const definition = defineTool({
  name: "createConversionAction",
  title: "Create Conversion Action",
  description:
    "Create a conversion action so the account can record conversions. Use type UPLOAD_CLICKS to set up offline-conversion tracking. Check for an existing action first with listConversionActions.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (input, ctx) => {
    const create: MutateOperation = { name: input.name, type: input.type };
    if (input.category !== undefined) create.category = input.category;
    if (input.status !== undefined) create.status = input.status;
    if (
      input.valueDefault !== undefined ||
      input.valueCurrencyCode !== undefined
    ) {
      const valueSettings: Record<string, unknown> = {};
      if (input.valueDefault !== undefined)
        valueSettings.defaultValue = input.valueDefault;
      if (input.valueCurrencyCode !== undefined)
        valueSettings.defaultCurrencyCode = input.valueCurrencyCode;
      create.valueSettings = valueSettings;
    }
    return mutate(ctx.fetch, {
      customerId: input.customerId,
      resource: "conversionActions",
      loginCustomerId: input.loginCustomerId,
      toolName: "createConversionAction",
      operations: [{ create }],
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
