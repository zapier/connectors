#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { searchGaql } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    status: z
      .enum(["ENABLED", "PAUSED", "REMOVED"])
      .describe(
        "Filter by campaign status. Omit to return all non-removed campaigns.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's next_page_token; omit for the first page.",
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
  results: z
    .array(
      z.object({
        id: z.string().describe("Campaign id."),
        name: z.string().describe("Campaign name.").optional(),
        status: z.string().describe("ENABLED, PAUSED, or REMOVED.").optional(),
        advertising_channel_type: z
          .string()
          .describe("SEARCH, DISPLAY, SHOPPING, VIDEO, PERFORMANCE_MAX, etc.")
          .optional(),
        campaign_budget: z
          .string()
          .describe(
            "Resource name of the linked budget; pass its id to updateCampaignBudget.",
          )
          .optional(),
        bidding_strategy_type: z
          .string()
          .describe("Bidding strategy, e.g. TARGET_CPA, MAXIMIZE_CONVERSIONS.")
          .optional(),
        start_date: z
          .string()
          .describe("Campaign start date, YYYY-MM-DD.")
          .optional(),
        end_date: z
          .string()
          .describe("Campaign end date, YYYY-MM-DD.")
          .optional(),
        resource_name: z
          .string()
          .describe("Full campaign resource name.")
          .optional(),
      }),
    )
    .describe("Campaigns matching the filter."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface CampaignRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    campaignBudget?: string;
    biddingStrategyType?: string;
    startDate?: string;
    endDate?: string;
    resourceName?: string;
  };
}

const definition = defineTool({
  name: "listCampaigns",
  title: "List Campaigns",
  description:
    "List campaigns with status, channel type, budget, and dates. Filter by status. For custom field sets or metrics, use search or getReport.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (input, ctx) => {
    const where = input.status
      ? `campaign.status = '${input.status}'`
      : "campaign.status != 'REMOVED'";
    const query =
      "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, " +
      "campaign.campaign_budget, campaign.bidding_strategy_type, campaign.start_date, campaign.end_date " +
      `FROM campaign WHERE ${where} ORDER BY campaign.id`;
    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "listCampaigns",
    });
    return {
      results: (results as CampaignRow[]).map((row) => {
        const c = row.campaign ?? {};
        return {
          id: c.id ?? "",
          name: c.name,
          status: c.status,
          advertising_channel_type: c.advertisingChannelType,
          campaign_budget: c.campaignBudget,
          bidding_strategy_type: c.biddingStrategyType,
          start_date: c.startDate,
          end_date: c.endDate,
          resource_name: c.resourceName,
        };
      }),
      next_page_token: nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
