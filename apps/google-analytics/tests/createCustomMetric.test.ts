import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCustomMetricDefinition from "../scripts/createCustomMetric.ts";

const { inputSchema } = createCustomMetricDefinition;

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

const validInput = {
  propertyId: "123456",
  parameterName: "score",
  displayName: "Score",
  measurementUnit: "STANDARD" as const,
  scope: "EVENT" as const,
};

describe("createCustomMetric: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a missing required field (displayName)", () => {
    const { displayName: _omit, ...rest } = validInput;
    expect(inputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a bad measurementUnit enum value", () => {
    expect(
      inputSchema.safeParse({ ...validInput, measurementUnit: "BYTES" })
        .success,
    ).toBe(false);
  });

  it("rejects a scope other than EVENT", () => {
    expect(
      inputSchema.safeParse({ ...validInput, scope: "USER" }).success,
    ).toBe(false);
  });
});

describe("createCustomMetric: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(createCustomMetricDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createCustomMetricDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("createCustomMetric: run", () => {
  it("POSTs to the Admin API customMetrics path with the metric body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456/customMetrics/9",
        parameterName: "score",
        displayName: "Score",
        measurementUnit: "STANDARD",
        scope: "EVENT",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createCustomMetricDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customMetrics",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parameterName: "score",
      displayName: "Score",
      measurementUnit: "STANDARD",
      scope: "EVENT",
    });
    expect(data.name).toBe("properties/123456/customMetrics/9");
  });

  it("rejects a 403 with a ConnectorHttpError carrying the GA4 Admin hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, status: "PERMISSION_DENIED", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createCustomMetricDefinition
      .run(validInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String((err as Error).message)).toContain("GA4 Admin");
  });
});
