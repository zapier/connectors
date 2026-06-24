import { describe, expect, it } from "vitest";

import listAdGroupsDefinition from "../scripts/listAdGroups.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = listAdGroupsDefinition;

describe("listAdGroups: run", () => {
  it("scopes to a campaign when campaignId is given and flattens rows", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          adGroup: {
            id: "900",
            name: "AG 1",
            status: "ENABLED",
            campaign: "customers/1/campaigns/555",
            type: "SEARCH_STANDARD",
            cpcBidMicros: "2500000",
            resourceName: "customers/1/adGroups/900",
          },
        },
      ],
    });

    const { data: result } = await listAdGroupsDefinition.run(
      { customerId: "1", campaignId: "555" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain(
      "ad_group.campaign = 'customers/1/campaigns/555'",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      id: "900",
      cpc_bid_micros: "2500000",
    });
  });
});
