import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createKeyEventDefinition from "../scripts/createKeyEvent.ts";

const { inputSchema } = createKeyEventDefinition;

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

describe("createKeyEvent: inputSchema", () => {
  it("accepts a valid input", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        eventName: "purchase",
        countingMethod: "ONCE_PER_EVENT",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing eventName", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        countingMethod: "ONCE_PER_EVENT",
      }).success,
    ).toBe(false);
  });

  it("rejects a bad countingMethod enum value", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        eventName: "purchase",
        countingMethod: "DAILY",
      }).success,
    ).toBe(false);
  });
});

describe("createKeyEvent: governance", () => {
  it("is a write (not read-only, not destructive)", () => {
    expect(createKeyEventDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createKeyEventDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createKeyEvent: run", () => {
  it("POSTs to the Admin API keyEvents endpoint with the body and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456/keyEvents/9",
        eventName: "purchase",
        countingMethod: "ONCE_PER_EVENT",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createKeyEventDefinition.run(
      {
        propertyId: "123456",
        eventName: "purchase",
        countingMethod: "ONCE_PER_EVENT",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/keyEvents",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      eventName: "purchase",
      countingMethod: "ONCE_PER_EVENT",
    });
    expect(data.name).toBe("properties/123456/keyEvents/9");
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createKeyEventDefinition
      .run(
        {
          propertyId: "123456",
          eventName: "purchase",
          countingMethod: "ONCE_PER_EVENT",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
