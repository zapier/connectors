import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import runRealtimeReportDefinition from "../scripts/runRealtimeReport.ts";

const { inputSchema } = runRealtimeReportDefinition;

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

const minimalInput = {
  propertyId: "123456",
  metrics: [{ name: "activeUsers" }],
};

describe("runRealtimeReport: inputSchema", () => {
  it("accepts a minimal valid report", () => {
    expect(inputSchema.safeParse(minimalInput).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(
      inputSchema.safeParse({ metrics: [{ name: "activeUsers" }] }).success,
    ).toBe(false);
  });

  it("accepts a recursive dimensionFilter tree", () => {
    expect(
      inputSchema.safeParse({
        ...minimalInput,
        dimensionFilter: { andGroup: { expressions: [] } },
      }).success,
    ).toBe(true);
  });
});

describe("runRealtimeReport: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(runRealtimeReportDefinition.annotations?.readOnlyHint).toBe(true);
    expect(runRealtimeReportDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("runRealtimeReport: run", () => {
  it("POSTs to the Data API, defaults limit to the string 100, and passes the dimensionFilter through", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        rows: [{ metricValues: [{ value: "7" }] }],
        rowCount: 1,
      });
    }) as typeof globalThis.fetch;

    const { data } = await runRealtimeReportDefinition.run(
      {
        ...minimalInput,
        dimensionFilter: { andGroup: { expressions: [] } },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsdata.googleapis.com/v1beta/properties/123456:runRealtimeReport",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.limit).toBe("100");
    expect(body.dimensionFilter).toEqual({ andGroup: { expressions: [] } });
    expect(data.rowCount).toBe(1);
  });

  it("throws a ConnectorHttpError carrying the quota hint on 429", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            message: "too many",
          },
        },
        { status: 429 },
      )) as typeof globalThis.fetch;

    const err = await runRealtimeReportDefinition
      .run(minimalInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("quota");
  });
});
