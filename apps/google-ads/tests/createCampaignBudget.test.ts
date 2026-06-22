import { describe, expect, it } from "vitest";

import createCampaignBudgetDefinition from "../scripts/createCampaignBudget.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = createCampaignBudgetDefinition;

describe("createCampaignBudget: run", () => {
  it("wraps the fields in a create operation and returns the resource name", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/campaignBudgets/77" }],
    });

    const { data: result } = await createCampaignBudgetDefinition.run(
      {
        customerId: "1",
        name: "Daily $50",
        amountMicros: "50000000",
        explicitlyShared: true,
      },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/customers/1/campaignBudgets:mutate",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{ create: Record<string, unknown> }>;
    };
    expect(body.operations[0]?.create).toMatchObject({
      name: "Daily $50",
      amountMicros: "50000000",
      explicitlyShared: true,
    });
    // deliveryMethod omitted -> not sent.
    expect(body.operations[0]?.create).not.toHaveProperty("deliveryMethod");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resource_name).toBe("customers/1/campaignBudgets/77");
  });
});
