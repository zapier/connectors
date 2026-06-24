import { describe, expect, it } from "vitest";

import listAdsDefinition from "../scripts/listAds.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = listAdsDefinition;

describe("listAds: run", () => {
  it("flattens the nested ad_group_ad.ad fields", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          adGroupAd: {
            status: "ENABLED",
            adGroup: "customers/1/adGroups/900",
            resourceName: "customers/1/adGroupAds/900~123",
            ad: {
              id: "123",
              name: "RSA 1",
              type: "RESPONSIVE_SEARCH_AD",
              finalUrls: ["https://example.com"],
            },
          },
        },
      ],
    });

    const { data: result } = await listAdsDefinition.run(
      { customerId: "1", adGroupId: "900" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain(
      "ad_group_ad.ad_group = 'customers/1/adGroups/900'",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      ad_id: "123",
      ad_name: "RSA 1",
      ad_type: "RESPONSIVE_SEARCH_AD",
      final_urls: ["https://example.com"],
      status: "ENABLED",
    });
  });
});
