import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCustomMetricsDefinition from "../scripts/listCustomMetrics.ts";

const { inputSchema } = listCustomMetricsDefinition;

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

describe("listCustomMetrics: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("listCustomMetrics: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(listCustomMetricsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listCustomMetricsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listCustomMetrics: run", () => {
  it("GETs the Admin API customMetrics path and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        customMetrics: [
          {
            name: "properties/123456/customMetrics/1",
            parameterName: "score",
            displayName: "Score",
            measurementUnit: "STANDARD",
            scope: "EVENT",
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCustomMetricsDefinition.run(
      { propertyId: "123456" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customMetrics",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.customMetrics?.[0]?.parameterName).toBe("score");
  });

  it("rejects a 403 with a ConnectorHttpError carrying the GA4 Admin hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, status: "PERMISSION_DENIED", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listCustomMetricsDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String((err as Error).message)).toContain("GA4 Admin");
  });
});
