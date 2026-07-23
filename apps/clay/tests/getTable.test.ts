import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getTableDefinition from "../scripts/getTable.ts";

const { inputSchema, outputSchema } = getTableDefinition;

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

// The wire nests the payload under `table`; the tool unwraps it.
const WIRE = {
  table: {
    fields: [
      { id: "f_1", name: "Company", type: "text" },
      {
        id: "f_2",
        name: "Stage",
        type: "select",
        options: [{ id: "o_1", text: "New" }],
      },
    ],
    views: [{ id: "v_1", name: "Default" }],
  },
};

describe("getTable: inputSchema", () => {
  it("requires tableId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ tableId: "t_1" }).success).toBe(true);
  });
});

describe("getTable: governance", () => {
  it("is read-only", () => {
    expect(getTableDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getTable: run", () => {
  it("GETs the table path and unwraps the `table` envelope", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(WIRE);
    }) as typeof globalThis.fetch;

    const { data: result } = await getTableDefinition.run(
      { tableId: "t_1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/tables/t_1");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.fields).toHaveLength(2);
    expect(result.views?.[0]?.id).toBe("v_1");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getTableDefinition
      .run({ tableId: "t_1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
