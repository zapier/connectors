import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createMeasurementProtocolSecretDefinition from "../scripts/createMeasurementProtocolSecret.ts";

const { inputSchema } = createMeasurementProtocolSecretDefinition;

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
  dataStreamId: "555",
  displayName: "Server secret",
};

describe("createMeasurementProtocolSecret: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a missing displayName", () => {
    const { displayName: _omit, ...rest } = validInput;
    expect(inputSchema.safeParse(rest).success).toBe(false);
  });
});

describe("createMeasurementProtocolSecret: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(
      createMeasurementProtocolSecretDefinition.annotations?.readOnlyHint,
    ).toBe(false);
    expect(
      createMeasurementProtocolSecretDefinition.annotations?.destructiveHint,
    ).toBe(false);
  });
});

describe("createMeasurementProtocolSecret: run", () => {
  it("POSTs to the secrets path with displayName and returns the secret", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "properties/123456/dataStreams/555/measurementProtocolSecrets/1",
        displayName: "Server secret",
        secretValue: "abc123secret",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createMeasurementProtocolSecretDefinition.run(
      validInput,
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/dataStreams/555/measurementProtocolSecrets",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      displayName: "Server secret",
    });
    expect(data.secretValue).toBe("abc123secret");
  });

  it("rejects a 403 with a ConnectorHttpError carrying the GA4 Admin hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, status: "PERMISSION_DENIED", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createMeasurementProtocolSecretDefinition
      .run(validInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect(String((err as Error).message)).toContain("GA4 Admin");
  });
});
