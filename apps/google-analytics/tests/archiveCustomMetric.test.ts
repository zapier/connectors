import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import archiveCustomMetricDefinition from "../scripts/archiveCustomMetric.ts";

const { inputSchema } = archiveCustomMetricDefinition;

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

const validInput = { propertyId: "123456", customMetricId: "7" };

describe("archiveCustomMetric: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a missing customMetricId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(false);
  });
});

describe("archiveCustomMetric: governance", () => {
  it("is flagged destructive", () => {
    expect(archiveCustomMetricDefinition.annotations?.destructiveHint).toBe(
      true,
    );
    expect(archiveCustomMetricDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("archiveCustomMetric: run", () => {
  it("POSTs to the :archive URL and returns an empty object", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({});
    }) as typeof globalThis.fetch;

    const { data } = await archiveCustomMetricDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customMetrics/7:archive",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data).toEqual({});
  });

  it("rejects a 403 with a ConnectorHttpError carrying the GA4 Admin hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, status: "PERMISSION_DENIED", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await archiveCustomMetricDefinition
      .run(validInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String((err as Error).message)).toContain("GA4 Admin");
  });
});
