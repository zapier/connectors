import { describe, expect, it } from "vitest";

import updateCampaignBudgetDefinition from "../scripts/updateCampaignBudget.ts";
import { recordingFetch } from "./helpers.ts";

const { inputSchema, outputSchema } = updateCampaignBudgetDefinition;

describe("updateCampaignBudget: inputSchema", () => {
  it("requires at least one field to update", () => {
    expect(
      inputSchema.safeParse({ customerId: "1", budgetId: "77" }).success,
    ).toBe(false);
  });
});

describe("updateCampaignBudget: run", () => {
  it("builds a dynamic updateMask listing only the supplied fields", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/campaignBudgets/77" }],
    });

    const { data: result } = await updateCampaignBudgetDefinition.run(
      { customerId: "1", budgetId: "77", amountMicros: "75000000" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{
        updateMask: string;
        update: Record<string, unknown>;
      }>;
    };
    // Only amount_micros was supplied -> mask lists exactly that.
    expect(body.operations[0]?.updateMask).toBe("amount_micros");
    expect(body.operations[0]?.update).toMatchObject({
      resourceName: "customers/1/campaignBudgets/77",
      amountMicros: "75000000",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("includes every supplied field in the mask", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/campaignBudgets/77" }],
    });
    await updateCampaignBudgetDefinition.run(
      {
        customerId: "1",
        budgetId: "77",
        amountMicros: "1",
        name: "New",
        deliveryMethod: "ACCELERATED",
      },
      { fetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{ updateMask: string }>;
    };
    expect(body.operations[0]?.updateMask).toBe(
      "amount_micros,name,delivery_method",
    );
  });
});
