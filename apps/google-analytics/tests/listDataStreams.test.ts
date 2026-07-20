import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listDataStreamsDefinition from "../scripts/listDataStreams.ts";

const { inputSchema } = listDataStreamsDefinition;

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

describe("listDataStreams: inputSchema", () => {
  it("accepts a propertyId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(true);
  });

  it("rejects a missing propertyId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("listDataStreams: governance", () => {
  it("is read-only", () => {
    expect(listDataStreamsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listDataStreamsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listDataStreams: run", () => {
  it("GETs the Admin API dataStreams endpoint and preserves webStreamData.measurementId through output validation", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        dataStreams: [
          {
            name: "properties/123456/dataStreams/789",
            displayName: "Acme Web",
            type: "WEB_DATA_STREAM",
            webStreamData: {
              measurementId: "G-ABC1234",
              defaultUri: "https://acme.example",
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listDataStreamsDefinition.run(
      { propertyId: "123456" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/dataStreams",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    // The G- measurement id must survive output validation intact.
    expect(data.dataStreams?.[0]?.webStreamData?.measurementId).toBe(
      "G-ABC1234",
    );
  });

  it("throws a ConnectorHttpError carrying the GA hint on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "no" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listDataStreamsDefinition
      .run({ propertyId: "123456" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
