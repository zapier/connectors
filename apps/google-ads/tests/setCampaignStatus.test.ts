import { describe, expect, it } from "vitest";

import setCampaignStatusDefinition from "../scripts/setCampaignStatus.ts";
import { googleAdsErrorBody, jsonResponse, recordingFetch } from "./helpers.ts";

const { outputSchema } = setCampaignStatusDefinition;

describe("setCampaignStatus: run", () => {
  it("builds the status mutate envelope and returns the resource name", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/campaigns/555" }],
    });

    const { data: result } = await setCampaignStatusDefinition.run(
      {
        customerId: "1",
        campaignId: "555",
        status: "PAUSED",
        loginCustomerId: "9",
      },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/customers/1/campaigns:mutate",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{
        updateMask: string;
        update: { resourceName: string; status: string };
      }>;
    };
    expect(body.operations[0]).toMatchObject({
      updateMask: "status",
      update: { resourceName: "customers/1/campaigns/555", status: "PAUSED" },
    });
    expect((calls[0]?.init?.headers as Headers).get("login-customer-id")).toBe(
      "9",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resource_name).toBe("customers/1/campaigns/555");
  });

  it("maps USER_PERMISSION_DENIED to a manager-account hint", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        googleAdsErrorBody(
          { authorizationError: "USER_PERMISSION_DENIED" },
          "User doesn't have permission to access customer.",
        ),
        { status: 403 },
      )) as typeof globalThis.fetch;
    const err = await setCampaignStatusDefinition
      .run(
        { customerId: "1", campaignId: "555", status: "PAUSED" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect((err as Error).message).toContain("loginCustomerId");
  });

  it("is idempotent and not flagged destructive", () => {
    expect(setCampaignStatusDefinition.annotations?.idempotentHint).toBe(true);
    expect(setCampaignStatusDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});
