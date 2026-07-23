import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateRecordDefinition from "../scripts/updateRecord.ts";

const { inputSchema, outputSchema } = updateRecordDefinition;

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

// Clay's update endpoint returns only an ack, not the record.
const ACK = { message: "Record updates enqueued" };

describe("updateRecord: inputSchema", () => {
  it("requires tableId, recordId, and cells", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ tableId: "t_1", recordId: "r_1" }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        tableId: "t_1",
        recordId: "r_1",
        cells: { f_1: "Acme" },
      }).success,
    ).toBe(true);
  });
});

describe("updateRecord: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateRecordDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateRecord: run", () => {
  it("PATCHes the record path with the cells map sent directly", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(ACK);
    }) as typeof globalThis.fetch;

    const { data: result } = await updateRecordDefinition.run(
      { tableId: "t_1", recordId: "r_1", cells: { f_1: "Acme" } },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.clay.com/v3/tables/t_1/records/r_1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({ f_1: "Acme" });
    expect(outputSchema.safeParse(result).success).toBe(true);
    // Echoes the recordId and surfaces the server ack (no record is returned).
    expect(result.recordId).toBe("r_1");
    expect(result.message).toBe("Record updates enqueued");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await updateRecordDefinition
      .run(
        { tableId: "t_1", recordId: "r_1", cells: { f_1: "x" } },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
