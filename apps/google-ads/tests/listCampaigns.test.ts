import { describe, expect, it } from "vitest";

import listCampaignsDefinition from "../scripts/listCampaigns.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = listCampaignsDefinition;

describe("listCampaigns: run", () => {
  it("excludes REMOVED by default and flattens campaign rows", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          campaign: {
            id: "555",
            name: "Search - Brand",
            status: "ENABLED",
            advertisingChannelType: "SEARCH",
            campaignBudget: "customers/1/campaignBudgets/77",
            biddingStrategyType: "TARGET_CPA",
            startDate: "2026-01-01",
            resourceName: "customers/1/campaigns/555",
          },
        },
      ],
      nextPageToken: "NXT",
    });

    const { data: result } = await listCampaignsDefinition.run(
      { customerId: "1234567890" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("campaign.status != 'REMOVED'");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      id: "555",
      name: "Search - Brand",
      advertising_channel_type: "SEARCH",
      campaign_budget: "customers/1/campaignBudgets/77",
      bidding_strategy_type: "TARGET_CPA",
      start_date: "2026-01-01",
    });
    expect(result.next_page_token).toBe("NXT");
  });

  it("filters by an explicit status", async () => {
    const { fetch, calls } = recordingFetch({ results: [] });
    await listCampaignsDefinition.run(
      { customerId: "1", status: "PAUSED" },
      { fetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("campaign.status = 'PAUSED'");
  });
});
