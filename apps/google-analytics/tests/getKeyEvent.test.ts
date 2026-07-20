import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getKeyEventDefinition from "../scripts/getKeyEvent.ts";

const { inputSchema } = getKeyEventDefinition;

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

describe("getKeyEvent: inputSchema", () => {
  it("accepts a valid input", () => {
    expect(
      inputSchema.safeParse({ propertyId: "123456", keyEventId: "1" }).success,
    ).toBe(true);
  });

  it("rejects a missing keyEventId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(false);
  });
});

describe("getKeyEvent: governance", () => {
  it("is read-only", () => {
    expect(getKeyEventDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getKeyEventDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getKeyEvent: run", () => {
  it("GETs the Admin API keyEvent endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456/keyEvents/1",
        eventName: "sign_up",
        countingMethod: "ONCE_PER_EVENT",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getKeyEventDefinition.run(
      { propertyId: "123456", keyEventId: "1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/keyEvents/1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.eventName).toBe("sign_up");
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getKeyEventDefinition
      .run({ propertyId: "123456", keyEventId: "1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
