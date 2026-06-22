import { describe, expect, it } from "vitest";

import listConversionActionsDefinition from "../scripts/listConversionActions.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = listConversionActionsDefinition;

describe("listConversionActions: run", () => {
  it("queries conversion_action and flattens rows", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          conversionAction: {
            id: "42",
            name: "Purchase",
            status: "ENABLED",
            type: "WEBPAGE",
            category: "PURCHASE",
            resourceName: "customers/1/conversionActions/42",
          },
        },
      ],
    });

    const { data: result } = await listConversionActionsDefinition.run(
      { customerId: "1" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("FROM conversion_action");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      id: "42",
      name: "Purchase",
      type: "WEBPAGE",
    });
  });
});
