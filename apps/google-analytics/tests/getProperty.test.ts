import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getPropertyDefinition from "../scripts/getProperty.ts";

const { inputSchema } = getPropertyDefinition;

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

describe("getProperty: inputSchema", () => {
  it("accepts a propertyId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getProperty: governance", () => {
  it("is read-only", () => {
    expect(getPropertyDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getPropertyDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getProperty: run", () => {
  it("GETs the Admin API property endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456",
        displayName: "Acme Web",
        currencyCode: "USD",
        timeZone: "America/Los_Angeles",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getPropertyDefinition.run(
      { propertyId: "123456" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.timeZone).toBe("America/Los_Angeles");
  });

  it("throws a ConnectorHttpError carrying the GA hint on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "no" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getPropertyDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
