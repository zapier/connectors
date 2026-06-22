import { describe, expect, it } from "vitest";

import createConversionActionDefinition from "../scripts/createConversionAction.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = createConversionActionDefinition;

describe("createConversionAction: run", () => {
  it("wraps the create op and nests valueSettings only when a value field is given", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/conversionActions/42" }],
    });

    const { data: result } = await createConversionActionDefinition.run(
      {
        customerId: "1",
        name: "Offline Purchase",
        type: "UPLOAD_CLICKS",
        valueDefault: 25,
        valueCurrencyCode: "USD",
      },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/customers/1/conversionActions:mutate",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{ create: Record<string, unknown> }>;
    };
    expect(body.operations[0]?.create).toMatchObject({
      name: "Offline Purchase",
      type: "UPLOAD_CLICKS",
      valueSettings: { defaultValue: 25, defaultCurrencyCode: "USD" },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resource_name).toBe("customers/1/conversionActions/42");
  });

  it("omits valueSettings when no value field is supplied", async () => {
    const { fetch, calls } = recordingFetch({
      results: [{ resourceName: "customers/1/conversionActions/43" }],
    });
    await createConversionActionDefinition.run(
      { customerId: "1", name: "Lead", type: "WEBPAGE" },
      { fetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      operations: Array<{ create: Record<string, unknown> }>;
    };
    expect(body.operations[0]?.create).not.toHaveProperty("valueSettings");
  });
});
