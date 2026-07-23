import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import lookupRow from "../skills/google-sheets-plg/scripts/lookupRow.ts";

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

describe("lookupRow: run (column scan + full-row read)", () => {
  it("finds the first match, reads the row, and maps it to a record", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // call 0 = header read; call 1 = column (COLUMNS) read; call 2 = full-row read
      if (calls.length === 1) {
        return jsonResponse({ values: [["Name", "Email"]] });
      }
      if (calls.length === 2) {
        // majorDimension=COLUMNS: one inner array = the column cells (header + data)
        return jsonResponse({ values: [["Email", "a@x.com", "b@y.com"]] });
      }
      return jsonResponse({ values: [["Sam", "b@y.com"]] });
    }) as typeof globalThis.fetch;

    const input = lookupRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Email",
      value: "b@y.com",
    });
    const { data: result } = await lookupRow.run(input, { fetch: fakeFetch });

    // The column read used majorDimension=COLUMNS on the Email column (col B).
    expect(calls[1]?.url).toContain("majorDimension=COLUMNS");
    expect(result.found).toBe(true);
    expect(result.row_number).toBe(3);
    expect(result.values).toEqual({ Name: "Sam", Email: "b@y.com" });
    expect(lookupRow.outputSchema.safeParse(result).success).toBe(true);
  });

  it("returns found:false (not an error) on a miss without reading a row", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (calls.length === 1) {
        return jsonResponse({ values: [["Name", "Email"]] });
      }
      return jsonResponse({ values: [["Email", "a@x.com", "b@y.com"]] });
    }) as typeof globalThis.fetch;

    const input = lookupRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Email",
      value: "nobody@z.com",
    });
    const { data: result } = await lookupRow.run(input, { fetch: fakeFetch });

    expect(result.found).toBe(false);
    expect(result.row_number).toBeNull();
    expect(result.values).toBeNull();
    // No full-row read happens on a miss (only header + column read).
    expect(calls.length).toBe(2);
    expect(lookupRow.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            message: "slow down",
          },
        },
        { status: 429 },
      )) as typeof globalThis.fetch;
    const input = lookupRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Email",
      value: "x",
    });
    const err = await lookupRow
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(429);
  });
});
