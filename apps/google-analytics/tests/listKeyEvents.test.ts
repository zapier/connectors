import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listKeyEventsDefinition from "../scripts/listKeyEvents.ts";

const { inputSchema } = listKeyEventsDefinition;

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

describe("listKeyEvents: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("listKeyEvents: governance", () => {
  it("is read-only", () => {
    expect(listKeyEventsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listKeyEventsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listKeyEvents: run", () => {
  it("GETs the Admin API keyEvents endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        keyEvents: [
          { name: "properties/123456/keyEvents/1", eventName: "purchase" },
        ],
        nextPageToken: null,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listKeyEventsDefinition.run(
      { propertyId: "123456" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/keyEvents",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.keyEvents?.[0]?.eventName).toBe("purchase");
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listKeyEventsDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
