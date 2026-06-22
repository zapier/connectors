import { describe, expect, it } from "vitest";

import listAccessibleCustomersDefinition from "../scripts/listAccessibleCustomers.ts";
import { jsonResponse, recordingFetch } from "./helpers.ts";

const { outputSchema } = listAccessibleCustomersDefinition;

describe("listAccessibleCustomers: run", () => {
  it("GETs listAccessibleCustomers and maps resourceNames -> resource_names", async () => {
    const { fetch, calls } = recordingFetch({
      resourceNames: ["customers/1234567890", "customers/2222222222"],
    });

    const { data: result } = await listAccessibleCustomersDefinition.run(
      {},
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/customers:listAccessibleCustomers",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resource_names).toEqual([
      "customers/1234567890",
      "customers/2222222222",
    ]);
  });

  it("returns an empty array when none are present", async () => {
    const fakeFetch = (async () => jsonResponse({})) as typeof globalThis.fetch;
    const { data: result } = await listAccessibleCustomersDefinition.run(
      {},
      { fetch: fakeFetch },
    );
    expect(result.resource_names).toEqual([]);
  });

  it("throws on a non-OK response", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: { message: "bad token" } },
        { status: 401 },
      )) as typeof globalThis.fetch;
    const err = await listAccessibleCustomersDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
  });
});
