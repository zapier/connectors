#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DEFAULT_ROW_LIMIT, searchGaql } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    campaignId: z
      .string()
      .describe("Restrict to one campaign. From listCampaigns.")
      .optional(),
    status: z
      .enum(["ENABLED", "PAUSED", "REMOVED"])
      .describe(
        "Filter by ad group status. Omit to return all non-removed ad groups.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .positive()
      .describe(
        `Maximum rows to return. Defaults to ${DEFAULT_ROW_LIMIT}. A soft cap — raise it or page via pageToken for more.`,
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
        id: z.string().describe("Ad group id."),
        name: z.string().describe("Ad group name.").optional(),
        status: z.string().describe("ENABLED, PAUSED, or REMOVED.").optional(),
        campaign: z
          .string()
          .describe("Resource name of the parent campaign.")
          .optional(),
        type: z
          .string()
          .describe("Ad group type, e.g. SEARCH_STANDARD.")
          .optional(),
        cpc_bid_micros: z
          .string()
          .describe(
            "Max CPC bid in micros (divide by 1,000,000 for the currency amount).",
          )
          .optional(),
        resource_name: z
          .string()
          .describe("Full ad group resource name.")
          .optional(),
      }),
    )
    .describe("Ad groups matching the filters."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface AdGroupRow {
  adGroup?: {
    id?: string;
    name?: string;
    status?: string;
    campaign?: string;
    type?: string;
    cpcBidMicros?: string;
    resourceName?: string;
  };
}

const definition = defineTool({
  name: "listAdGroups",
  title: "List Ad Groups",
  description:
    "List ad groups, optionally scoped to one campaign. Filter by status. For metrics or custom fields, use search or getReport.",
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
    const filters: string[] = [];
    if (input.status) filters.push(`ad_group.status = '${input.status}'`);
    else filters.push("ad_group.status != 'REMOVED'");
    if (input.campaignId)
      filters.push(
        `ad_group.campaign = 'customers/${input.customerId}/campaigns/${input.campaignId}'`,
      );
    const query =
      "SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign, ad_group.type, ad_group.cpc_bid_micros " +
      `FROM ad_group WHERE ${filters.join(" AND ")} ORDER BY ad_group.id LIMIT ${input.limit ?? DEFAULT_ROW_LIMIT}`;
    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "listAdGroups",
    });
    return {
      results: (results as AdGroupRow[]).map((row) => {
        const a = row.adGroup ?? {};
        return {
          id: a.id ?? "",
          name: a.name,
          status: a.status,
          campaign: a.campaign,
          type: a.type,
          cpc_bid_micros: a.cpcBidMicros,
          resource_name: a.resourceName,
        };
      }),
      next_page_token: nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
