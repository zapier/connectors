import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listRecordsDefinition from "../scripts/listRecords.ts";

const { inputSchema, outputSchema } = listRecordsDefinition;

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

const BODY = { results: [{ id: "r_1", cells: { f_1: "Acme" } }] };

describe("listRecords: inputSchema", () => {
  it("requires tableId and viewId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ tableId: "t_1" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ tableId: "t_1", viewId: "v_1" }).success,
    ).toBe(true);
  });
});

describe("listRecords: governance", () => {
  it("is read-only", () => {
    expect(listRecordsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listRecords: run", () => {
  it("GETs the view records path with a default limit of 20", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BODY);
    }) as typeof globalThis.fetch;

    const { data: result } = await listRecordsDefinition.run(
      { tableId: "t_1", viewId: "v_1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.clay.com/v3/tables/t_1/views/v_1/records?limit=20",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("honors an explicit limit", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BODY);
    }) as typeof globalThis.fetch;

    await listRecordsDefinition.run(
      { tableId: "t_1", viewId: "v_1", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.clay.com/v3/tables/t_1/views/v_1/records?limit=5",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 500 },
      )) as typeof globalThis.fetch;

    const err = await listRecordsDefinition
      .run({ tableId: "t_1", viewId: "v_1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(500);
  });
});
