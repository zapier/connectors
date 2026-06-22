import { describe, expect, it } from "vitest";

import listCustomerClientsDefinition from "../scripts/listCustomerClients.ts";
import { recordingFetch } from "./helpers.ts";

const { inputSchema, outputSchema } = listCustomerClientsDefinition;

describe("listCustomerClients: run", () => {
  it("queries customer_client under the manager and flattens the rows", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          customerClient: {
            id: "3333333333",
            descriptiveName: "Client A",
            manager: false,
            level: "1",
            currencyCode: "USD",
            timeZone: "America/New_York",
            resourceName: "customers/1/customerClients/3333333333",
          },
        },
      ],
    });

    const { data: result } = await listCustomerClientsDefinition.run(
      { customerId: "1111111111" },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("FROM customer_client");
    // Manager accounts excluded by default.
    expect(body.query).toContain("customer_client.manager = false");
    // The manager id is sent as login-customer-id.
    expect((calls[0]?.init?.headers as Headers).get("login-customer-id")).toBe(
      "1111111111",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      id: "3333333333",
      descriptive_name: "Client A",
      currency_code: "USD",
      time_zone: "America/New_York",
    });
  });

  it("includes managers when includeManager is true", async () => {
    const { fetch, calls } = recordingFetch({ results: [] });
    await listCustomerClientsDefinition.run(
      { customerId: "1", includeManager: true },
      { fetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).not.toContain("customer_client.manager = false");
  });

  it("rejects unknown fields (strict input)", () => {
    expect(
      inputSchema.safeParse({ customerId: "1", bogus: true }).success,
    ).toBe(false);
  });
});
