import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listVideosDefinition from "../scripts/listVideos.ts";

const { inputSchema, outputSchema } = listVideosDefinition;

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

describe("listVideos: inputSchema", () => {
  it("accepts an empty input (lists recent videos)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({
        title: "demo",
        folder_id: "f_1",
        limit: 25,
        token: "cursor_abc",
      }).success,
    ).toBe(true);
  });

  it("rejects a limit below 1", () => {
    expect(inputSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe("listVideos: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(listVideosDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listVideosDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listVideos: run", () => {
  it("GETs /v3/videos, applies the default limit, and maps {data} to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [{ id: "v_1", status: "completed" }],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listVideosDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const called = new URL(calls[0]!.url);
    expect(`${called.origin}${called.pathname}`).toBe(
      "https://api.heygen.com/v3/videos",
    );
    expect(called.searchParams.get("limit")).toBe("10");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.id).toBe("v_1");
    expect(result.has_more).toBe(false);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "bad key" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listVideosDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
