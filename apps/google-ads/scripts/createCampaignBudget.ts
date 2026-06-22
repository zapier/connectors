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
    name: z.string().describe("Budget name, unique within the account."),
    amountMicros: z
      .string()
      .describe(
        "Daily budget in micros: currency amount x 1,000,000 (e.g. $50.00 -> 50000000).",
      ),
    deliveryMethod: z
      .enum(["STANDARD", "ACCELERATED"])
      .describe("How fast to spend the budget. Defaults to STANDARD.")
      .optional(),
    explicitlyShared: z
      .boolean()
      .describe(
        "True for a shared budget usable by multiple campaigns. Defaults to false.",
      )
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
      "Resource name of the created budget, customers/{customerId}/campaignBudgets/{id}.",
    ),
});

const definition = defineTool({
  name: "createCampaignBudget",
  title: "Create Campaign Budget",
  description:
    "Create a campaign budget. amountMicros is the daily budget in micros (currency x 1,000,000). A budget is a prerequisite for a campaign; adjust an existing one with updateCampaignBudget.",
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
    const create: MutateOperation = {
      name: input.name,
      amountMicros: input.amountMicros,
    };
    if (input.deliveryMethod !== undefined)
      create.deliveryMethod = input.deliveryMethod;
    if (input.explicitlyShared !== undefined)
      create.explicitlyShared = input.explicitlyShared;
    return mutate(ctx.fetch, {
      customerId: input.customerId,
      resource: "campaignBudgets",
      loginCustomerId: input.loginCustomerId,
      toolName: "createCampaignBudget",
      operations: [{ create }],
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
