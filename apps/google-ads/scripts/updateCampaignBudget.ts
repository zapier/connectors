#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { mutate } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    budgetId: z
      .string()
      .describe(
        "Budget id to update. From listCampaigns (campaign_budget resource name) or search.",
      ),
    amountMicros: z
      .string()
      .describe("New daily budget in micros: currency amount x 1,000,000.")
      .optional(),
    name: z.string().describe("New budget name.").optional(),
    deliveryMethod: z
      .enum(["STANDARD", "ACCELERATED"])
      .describe("New delivery method.")
      .optional(),
    loginCustomerId: z
      .string()
      .describe(
        "Manager (MCC) account id, digits only. Required only when the operating account is reached through a manager account; omit for direct access.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (i) =>
      i.amountMicros !== undefined ||
      i.name !== undefined ||
      i.deliveryMethod !== undefined,
    {
      message:
        "Provide at least one of amountMicros, name, or deliveryMethod to update.",
      path: ["amountMicros"],
    },
  );

const outputSchema = z.object({
  resource_name: z
    .string()
    .describe(
      "Resource name of the updated budget, customers/{customerId}/campaignBudgets/{budgetId}.",
    ),
});

const definition = defineTool({
  name: "updateCampaignBudget",
  title: "Update Campaign Budget",
  description:
    "Update an existing campaign budget's daily amount, name, or delivery method. Only the fields you pass are changed. Find the budget id via listCampaigns or search.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  // A mutate update only changes the fields named in updateMask, so the mask is built
  // dynamically from exactly the inputs the agent supplied (omitted fields are untouched).
  run: async (input, ctx) => {
    const update: Record<string, unknown> = {
      resourceName: `customers/${input.customerId}/campaignBudgets/${input.budgetId}`,
    };
    const mask: string[] = [];
    if (input.amountMicros !== undefined) {
      update.amountMicros = input.amountMicros;
      mask.push("amount_micros");
    }
    if (input.name !== undefined) {
      update.name = input.name;
      mask.push("name");
    }
    if (input.deliveryMethod !== undefined) {
      update.deliveryMethod = input.deliveryMethod;
      mask.push("delivery_method");
    }
    return mutate(ctx.fetch, {
      customerId: input.customerId,
      resource: "campaignBudgets",
      loginCustomerId: input.loginCustomerId,
      toolName: "updateCampaignBudget",
      operations: [{ updateMask: mask.join(","), update }],
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
