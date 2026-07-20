import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteKeyEventDefinition from "../scripts/deleteKeyEvent.ts";

const { inputSchema } = deleteKeyEventDefinition;

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

describe("deleteKeyEvent: inputSchema", () => {
  it("accepts a valid input", () => {
    expect(
      inputSchema.safeParse({ propertyId: "123456", keyEventId: "1" }).success,
    ).toBe(true);
  });

  it("rejects a missing keyEventId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(false);
  });
});

describe("deleteKeyEvent: governance", () => {
  it("is destructive", () => {
    expect(deleteKeyEventDefinition.annotations?.destructiveHint).toBe(true);
    expect(deleteKeyEventDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("deleteKeyEvent: run", () => {
  it("DELETEs the Admin API keyEvent endpoint and returns an empty object", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({});
    }) as typeof globalThis.fetch;

    const { data } = await deleteKeyEventDefinition.run(
      { propertyId: "123456", keyEventId: "1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/keyEvents/1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({});
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await deleteKeyEventDefinition
      .run({ propertyId: "123456", keyEventId: "1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
