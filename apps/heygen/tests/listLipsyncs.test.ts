import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listLipsyncsDefinition from "../scripts/listLipsyncs.ts";

const { inputSchema, outputSchema } = listLipsyncsDefinition;

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

describe("listLipsyncs: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a limit and token", () => {
    expect(inputSchema.safeParse({ limit: 25, token: "cur_1" }).success).toBe(
      true,
    );
  });

  it("rejects a limit below 1", () => {
    expect(inputSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe("listLipsyncs: governance", () => {
  it("is read-only", () => {
    expect(listLipsyncsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listLipsyncs: run", () => {
  it("GETs /v3/lipsyncs, defaults limit, and maps data to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [
          { id: "ls_1", status: "completed" },
          { id: "ls_2", status: "running" },
        ],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listLipsyncsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const requested = new URL(calls[0]?.url as string);
    expect(requested.origin + requested.pathname).toBe(
      "https://api.heygen.com/v3/lipsyncs",
    );
    expect(requested.searchParams.get("limit")).toBe("10");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.has_more).toBe(false);
    expect(result.next_token).toBeNull();
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "bad key" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listLipsyncsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
