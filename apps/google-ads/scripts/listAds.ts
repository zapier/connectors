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
    adGroupId: z
      .string()
      .describe("Restrict to one ad group. From listAdGroups.")
      .optional(),
    status: z
      .enum(["ENABLED", "PAUSED", "REMOVED"])
      .describe("Filter by ad status. Omit to return all non-removed ads.")
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
        ad_id: z.string().describe("The ad's id.").optional(),
        ad_name: z.string().describe("The ad's display name.").optional(),
        ad_type: z
          .string()
          .describe("Ad type, e.g. RESPONSIVE_SEARCH_AD.")
          .optional(),
        final_urls: z
          .array(z.string())
          .describe("Landing-page URLs.")
          .optional(),
        status: z.string().describe("ENABLED, PAUSED, or REMOVED.").optional(),
        ad_group: z
          .string()
          .describe("Resource name of the parent ad group.")
          .optional(),
        resource_name: z
          .string()
          .describe("Full ad_group_ad resource name.")
          .optional(),
      }),
    )
    .describe("Ads matching the filters."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface AdGroupAdRow {
  adGroupAd?: {
    status?: string;
    adGroup?: string;
    resourceName?: string;
    ad?: { id?: string; name?: string; type?: string; finalUrls?: string[] };
  };
}

const definition = defineTool({
  name: "listAds",
  title: "List Ads",
  description:
    "List ads, optionally scoped to one ad group. Filter by status. For metrics or custom fields, use search or getReport.",
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
    if (input.status) filters.push(`ad_group_ad.status = '${input.status}'`);
    else filters.push("ad_group_ad.status != 'REMOVED'");
    if (input.adGroupId)
      filters.push(
        `ad_group_ad.ad_group = 'customers/${input.customerId}/adGroups/${input.adGroupId}'`,
      );
    const query =
      "SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, " +
      "ad_group_ad.status, ad_group_ad.ad_group " +
      `FROM ad_group_ad WHERE ${filters.join(" AND ")}`;
    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "listAds",
    });
    return {
      results: (results as AdGroupAdRow[]).map((row) => {
        const aga = row.adGroupAd ?? {};
        const ad = aga.ad ?? {};
        return {
          ad_id: ad.id,
          ad_name: ad.name,
          ad_type: ad.type,
          final_urls: ad.finalUrls,
          status: aga.status,
          ad_group: aga.adGroup,
          resource_name: aga.resourceName,
        };
      }),
      next_page_token: nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
