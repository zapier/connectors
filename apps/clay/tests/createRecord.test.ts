import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createRecordDefinition from "../scripts/createRecord.ts";

const { inputSchema, outputSchema } = createRecordDefinition;

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

// Wire returns the created rows under `records`; the tool unwraps records[0].
const WIRE = { records: [{ id: "r_1", cells: { f_1: "Acme" } }] };

describe("createRecord: inputSchema", () => {
  it("requires tableId and cells", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ tableId: "t_1" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ tableId: "t_1", cells: { f_1: "Acme" } }).success,
    ).toBe(true);
  });
});

describe("createRecord: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createRecordDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createRecord: run", () => {
  it("POSTs the record wrapped in a records[] envelope and unwraps records[0]", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(WIRE);
    }) as typeof globalThis.fetch;

    const { data: result } = await createRecordDefinition.run(
      { tableId: "t_1", cells: { f_1: "Acme" } },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/tables/t_1/records");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      records: [{ cells: { f_1: "Acme" } }],
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("r_1");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await createRecordDefinition
      .run({ tableId: "t_1", cells: { f_1: "Acme" } }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
