import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import runReportDefinition from "../scripts/runReport.ts";

const { inputSchema } = runReportDefinition;

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
  dimensions: [{ name: "country" }],
  metrics: [{ name: "activeUsers" }],
  dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
};

describe("runReport: inputSchema", () => {
  it("accepts a minimal valid report", () => {
    expect(inputSchema.safeParse(minimalInput).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    const { propertyId, ...rest } = minimalInput;
    void propertyId;
    expect(inputSchema.safeParse(rest).success).toBe(false);
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

describe("runReport: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(runReportDefinition.annotations?.readOnlyHint).toBe(true);
    expect(runReportDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("runReport: run", () => {
  it("POSTs to the Data API, defaults limit to the string 100, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        rows: [{ metricValues: [{ value: "42" }] }],
        rowCount: 1,
      });
    }) as typeof globalThis.fetch;

    const { data } = await runReportDefinition.run(
      {
        ...minimalInput,
        dimensionFilter: { andGroup: { expressions: [] } },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsdata.googleapis.com/v1beta/properties/123456:runReport",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    // The connector default is the int64 STRING "100", not the number 100.
    expect(body.limit).toBe("100");
    expect(body.dimensionFilter).toEqual({ andGroup: { expressions: [] } });
    expect(data.rowCount).toBe(1);
  });

  it("throws a ConnectorHttpError carrying the GA hint on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "denied",
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await runReportDefinition
      .run(minimalInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
