import { describe, expect, it } from "vitest";

import searchDefinition from "../scripts/search.ts";

const { inputSchema, outputSchema } = searchDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("search: inputSchema", () => {
  it("accepts customerId + query", () => {
    expect(
      inputSchema.safeParse({
        customerId: "1234567890",
        query: "SELECT campaign.id FROM campaign",
      }).success,
    ).toBe(true);
  });
  it("requires query", () => {
    expect(inputSchema.safeParse({ customerId: "1234567890" }).success).toBe(
      false,
    );
  });
});

describe("search: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("search: run", () => {
  it("POSTs the query to googleAds:search and returns the rows + page token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({
        results: [{ campaign: { id: "111", name: "Brand" } }],
        nextPageToken: "PAGE2",
        fieldMask: "campaign.id,campaign.name",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchDefinition.run(
      {
        customerId: "1234567890",
        query: "SELECT campaign.id, campaign.name FROM campaign",
        loginCustomerId: "9999999999",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/customers/1234567890/googleAds:search",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      query: "SELECT campaign.id, campaign.name FROM campaign",
    });
    // login-customer-id header carries the manager account.
    expect((calls[0]?.init?.headers as Headers).get("login-customer-id")).toBe(
      "9999999999",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.next_page_token).toBe("PAGE2");
  });

  it("maps a GAQL query error to an actionable message", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            details: [
              {
                errors: [
                  {
                    errorCode: {
                      queryError: "BAD_RESOURCE_TYPE_IN_FROM_CLAUSE",
                    },
                    message: "Unrecognized resource.",
                  },
                ],
              },
            ],
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await searchDefinition
      .run(
        { customerId: "1", query: "SELECT x FROM bogus" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("listSearchableFields");
  });
});
