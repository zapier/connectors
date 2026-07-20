import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import archiveCustomDimensionDefinition from "../scripts/archiveCustomDimension.ts";

const { inputSchema } = archiveCustomDimensionDefinition;

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

describe("archiveCustomDimension: inputSchema", () => {
  it("accepts a valid input", () => {
    expect(
      inputSchema.safeParse({ propertyId: "123456", customDimensionId: "1" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing customDimensionId", () => {
    expect(inputSchema.safeParse({ propertyId: "123456" }).success).toBe(false);
  });
});

describe("archiveCustomDimension: governance", () => {
  it("is destructive", () => {
    expect(archiveCustomDimensionDefinition.annotations?.destructiveHint).toBe(
      true,
    );
    expect(archiveCustomDimensionDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
  });
});

describe("archiveCustomDimension: run", () => {
  it("POSTs to the :archive URL and returns an empty object", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({});
    }) as typeof globalThis.fetch;

    const { data } = await archiveCustomDimensionDefinition.run(
      { propertyId: "123456", customDimensionId: "1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/customDimensions/1:archive",
    );
    expect(calls[0]?.init?.method).toBe("POST");
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

    const err = await archiveCustomDimensionDefinition
      .run(
        { propertyId: "123456", customDimensionId: "1" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String(err)).toContain("GA4 Admin");
  });
});
