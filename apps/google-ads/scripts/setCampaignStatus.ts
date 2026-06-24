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
    campaignId: z
      .string()
      .describe("Campaign id to update. From listCampaigns or search."),
    status: z
      .enum(["ENABLED", "PAUSED", "REMOVED"])
      .describe(
        "New campaign status. REMOVED is permanent — a removed campaign cannot be re-enabled.",
      ),
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
      "Resource name of the updated campaign, customers/{customerId}/campaigns/{campaignId}.",
    ),
});

const definition = defineTool({
  name: "setCampaignStatus",
  title: "Set Campaign Status",
  description:
    "Pause, enable, or remove a campaign. Supply the campaign id and the target status; the mutate operation and update mask are assembled for you. REMOVED is irreversible.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    // status: 'REMOVED' is an irreversible delete, so this tool can perform a
    // destructive update even though pause/enable are reversible.
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (input, ctx) =>
    mutate(ctx.fetch, {
      customerId: input.customerId,
      resource: "campaigns",
      loginCustomerId: input.loginCustomerId,
      toolName: "setCampaignStatus",
      operations: [
        {
          updateMask: "status",
          update: {
            resourceName: `customers/${input.customerId}/campaigns/${input.campaignId}`,
            status: input.status,
          },
        },
      ],
    }),
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
