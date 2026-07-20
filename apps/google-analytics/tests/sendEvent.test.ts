import { describe, expect, it } from "vitest";

import sendEventDefinition from "../scripts/sendEvent.ts";

const { inputSchema } = sendEventDefinition;

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

const events = [{ name: "purchase", params: { value: 9.99, currency: "USD" } }];

describe("sendEvent: inputSchema", () => {
  it("accepts measurementId + clientId + events (web)", () => {
    expect(
      inputSchema.safeParse({
        apiSecret: "s",
        measurementId: "G-ABC123",
        clientId: "111.222",
        events,
      }).success,
    ).toBe(true);
  });

  it("rejects providing BOTH measurementId and firebaseAppId", () => {
    expect(
      inputSchema.safeParse({
        apiSecret: "s",
        measurementId: "G-ABC123",
        clientId: "111.222",
        firebaseAppId: "1:1234567890:android:abc123",
        appInstanceId: "aaa",
        events,
      }).success,
    ).toBe(false);
  });

  it("rejects providing NEITHER measurementId nor firebaseAppId", () => {
    expect(
      inputSchema.safeParse({ apiSecret: "s", clientId: "111.222", events })
        .success,
    ).toBe(false);
  });

  it("rejects measurementId without clientId", () => {
    expect(
      inputSchema.safeParse({
        apiSecret: "s",
        measurementId: "G-ABC123",
        events,
      }).success,
    ).toBe(false);
  });

  it("rejects firebaseAppId without appInstanceId", () => {
    expect(
      inputSchema.safeParse({
        apiSecret: "s",
        firebaseAppId: "1:1234567890:android:abc123",
        events,
      }).success,
    ).toBe(false);
  });
});

describe("sendEvent: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(sendEventDefinition.annotations?.readOnlyHint).toBe(false);
    expect(sendEventDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("sendEvent: run", () => {
  it("POSTs to /mp/collect with api_secret + measurement_id query params, a client_id + events body, and returns { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // /mp/collect normally returns 2xx (often 204) with no body.
      return jsonResponse({}, { status: 204 });
    }) as typeof globalThis.fetch;

    const { data } = await sendEventDefinition.run(
      {
        apiSecret: "sekret",
        measurementId: "G-ABC123",
        clientId: "111.222",
        events,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://www.google-analytics.com/mp/collect",
    );
    expect(url.searchParams.get("api_secret")).toBe("sekret");
    expect(url.searchParams.get("measurement_id")).toBe("G-ABC123");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.client_id).toBe("111.222");
    expect(body.events).toEqual(events);
    expect(data).toEqual({ success: true });
  });

  it("rejects when /mp/collect returns a non-2xx (400)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad request" },
        {
          status: 400,
        },
      )) as typeof globalThis.fetch;

    const err = await sendEventDefinition
      .run(
        {
          apiSecret: "sekret",
          measurementId: "G-ABC123",
          clientId: "111.222",
          events,
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toContain("400");
  });
});
