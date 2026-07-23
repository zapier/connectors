import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findRecordDefinition from "../scripts/findRecord.ts";

const { inputSchema, outputSchema } = findRecordDefinition;

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

// getTable schema (fetched internally) + the find results.
const SCHEMA = {
  table: {
    fields: [
      { id: "f_company", type: "text" },
      { id: "f_stage", type: "select" },
    ],
  },
};
const RESULTS = { results: [{ id: "r_1", cells: { f_company: "Acme" } }] };

function twoStageFetch(
  calls: Array<{ url: string; init: RequestInit | undefined }>,
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/find") || url.includes("/find?"))
      return jsonResponse(RESULTS);
    return jsonResponse(SCHEMA);
  }) as typeof globalThis.fetch;
}

describe("findRecord: inputSchema", () => {
  it("requires tableId and filters", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ tableId: "t_1" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ tableId: "t_1", filters: { f_company: "Acme" } })
        .success,
    ).toBe(true);
  });
});

describe("findRecord: run", () => {
  it("fetches the schema, then POSTs an AND filter with per-type operators", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const { data: result } = await findRecordDefinition.run(
      { tableId: "t_1", filters: { f_company: "Acme", f_stage: "o_1" } },
      { fetch: twoStageFetch(calls) },
    );

    // first call: schema; second call: find
    expect(calls[0]?.url).toBe("https://api.clay.com/v3/tables/t_1");
    expect(calls[1]?.url).toBe("https://api.clay.com/v3/tables/t_1/find");
    expect(calls[1]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.filter.type).toBe("AND");
    const byField = Object.fromEntries(
      body.filter.operands.map((o: { fieldId: string }) => [o.fieldId, o]),
    );
    expect(byField.f_company.type).toBe("FIELD");
    expect(byField.f_company.filterConfig).toEqual({
      type: "OPERATOR",
      operator: "EQUAL",
      value: "Acme",
    });
    // select field maps to SELECT_EQUAL
    expect(byField.f_stage.filterConfig.operator).toBe("SELECT_EQUAL");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("passes an explicit limit as a query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    await findRecordDefinition.run(
      { tableId: "t_1", filters: { f_company: "Acme" }, limit: 3 },
      { fetch: twoStageFetch(calls) },
    );
    expect(calls[1]?.url).toBe(
      "https://api.clay.com/v3/tables/t_1/find?limit=3",
    );
  });

  it("throws a ConnectorHttpError when the schema fetch is non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await findRecordDefinition
      .run(
        { tableId: "t_1", filters: { f_company: "Acme" } },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
