import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCustomDimensionsDefinition from "../scripts/listCustomDimensions.ts";

const { inputSchema } = listCustomDimensionsDefinition;

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

describe("listCustomDimensions: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("listCustomDimensions: governance", () => {
  it("is read-only", () => {
    expect(listCustomDimensionsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listCustomDimensionsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listCustomDimensions: run", () => {
  it("GETs the Admin API customDimensions endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        customDimensions: [
          {
            name: "properties/123456/customDimensions/1",
            parameterName: "article_id",
            displayName: "Article ID",
            scope: "EVENT",
          },
        ],
        nextPageToken: null,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCustomDimensionsDefinition.run(
      { propertyId: "123456" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customDimensions",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.customDimensions?.[0]?.parameterName).toBe("article_id");
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listCustomDimensionsDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
