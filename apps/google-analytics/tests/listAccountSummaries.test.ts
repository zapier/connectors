import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listAccountSummariesDefinition from "../scripts/listAccountSummaries.ts";

const { inputSchema } = listAccountSummariesDefinition;

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

describe("listAccountSummaries: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a pageToken", () => {
    expect(inputSchema.safeParse({ pageToken: "abc" }).success).toBe(true);
  });

  it("rejects an unknown field", () => {
    expect(inputSchema.safeParse({ foo: "bar" }).success).toBe(false);
  });
});

describe("listAccountSummaries: governance", () => {
  it("is read-only", () => {
    expect(listAccountSummariesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listAccountSummariesDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listAccountSummaries: run", () => {
  it("GETs the Admin API accountSummaries endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        accountSummaries: [
          {
            account: "accounts/111",
            displayName: "Acme",
            propertySummaries: [
              { property: "properties/123456", displayName: "Acme Web" },
            ],
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listAccountSummariesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.accountSummaries?.[0]?.propertySummaries?.[0]?.property).toBe(
      "properties/123456",
    );
  });

  it("throws a ConnectorHttpError carrying the GA hint on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "no" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listAccountSummariesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
