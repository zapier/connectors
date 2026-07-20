import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import checkCompatibilityDefinition from "../scripts/checkCompatibility.ts";

const { inputSchema } = checkCompatibilityDefinition;

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

describe("checkCompatibility: inputSchema", () => {
  it("accepts dimensions + metrics", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
      }).success,
    ).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(
      inputSchema.safeParse({ dimensions: [{ name: "country" }] }).success,
    ).toBe(false);
  });

  it("rejects a bad compatibilityFilter enum value", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        compatibilityFilter: "MAYBE",
      }).success,
    ).toBe(false);
  });
});

describe("checkCompatibility: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(checkCompatibilityDefinition.annotations?.readOnlyHint).toBe(true);
    expect(checkCompatibilityDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("checkCompatibility: run", () => {
  it("POSTs to the Data API and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        dimensionCompatibilities: [
          {
            dimensionMetadata: { apiName: "country" },
            compatibility: "COMPATIBLE",
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await checkCompatibilityDefinition.run(
      {
        propertyId: "123456",
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsdata.googleapis.com/v1beta/properties/123456:checkCompatibility",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.dimensions).toEqual([{ name: "country" }]);
    expect(data.dimensionCompatibilities?.[0]?.compatibility).toBe(
      "COMPATIBLE",
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

    const err = await checkCompatibilityDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
