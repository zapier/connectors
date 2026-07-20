import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCustomDimensionDefinition from "../scripts/createCustomDimension.ts";

const { inputSchema } = createCustomDimensionDefinition;

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

describe("createCustomDimension: inputSchema", () => {
  it("accepts a valid input", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        parameterName: "article_id",
        displayName: "Article ID",
        scope: "EVENT",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing displayName", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        parameterName: "article_id",
        scope: "EVENT",
      }).success,
    ).toBe(false);
  });

  it("rejects a bad scope enum value", () => {
    expect(
      inputSchema.safeParse({
        propertyId: "123456",
        parameterName: "article_id",
        displayName: "Article ID",
        scope: "SESSION",
      }).success,
    ).toBe(false);
  });
});

describe("createCustomDimension: governance", () => {
  it("is a write (not read-only, not destructive)", () => {
    expect(createCustomDimensionDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
    expect(createCustomDimensionDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("createCustomDimension: run", () => {
  it("POSTs to the Admin API customDimensions endpoint with the body and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456/customDimensions/1",
        parameterName: "article_id",
        displayName: "Article ID",
        scope: "EVENT",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createCustomDimensionDefinition.run(
      {
        propertyId: "123456",
        parameterName: "article_id",
        displayName: "Article ID",
        scope: "EVENT",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customDimensions",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parameterName: "article_id",
      displayName: "Article ID",
      scope: "EVENT",
    });
    expect(data.name).toBe("properties/123456/customDimensions/1");
  });

  it("rejects a 403 with the GA4 Admin access hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "denied" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createCustomDimensionDefinition
      .run(
        {
          propertyId: "123456",
          parameterName: "article_id",
          displayName: "Article ID",
          scope: "EVENT",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
