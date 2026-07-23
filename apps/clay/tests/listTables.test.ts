import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listTablesDefinition from "../scripts/listTables.ts";

const { inputSchema, outputSchema } = listTablesDefinition;

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

// The /v3 wire returns rows under `results`; the tool maps them to `tables`.
const BODY = { results: [{ id: "t_1", name: "Leads" }] };

describe("listTables: inputSchema", () => {
  it("requires workspaceId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ workspaceId: "w_1" }).success).toBe(true);
  });
});

describe("listTables: governance", () => {
  it("is read-only", () => {
    expect(listTablesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listTables: run", () => {
  it("GETs the workspace tables path and returns the list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(BODY);
    }) as typeof globalThis.fetch;

    const { data: result } = await listTablesDefinition.run(
      { workspaceId: "w_1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/workspaces/w_1/tables");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.tables).toHaveLength(1);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listTablesDefinition
      .run({ workspaceId: "w_1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
