import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findRows from "../scripts/findRows.ts";

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

describe("findRows: run (scan data range, bounded)", () => {
  it("returns all matching rows with their row numbers", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (calls.length === 1) {
        return jsonResponse({ values: [["Name", "Status", "Amount"]] });
      }
      // data range (A2:ZZZ), one inner array per row
      return jsonResponse({
        values: [
          ["Sam", "Open", "10"],
          ["Lee", "Done", "20"],
          ["Mo", "open", "30"],
        ],
      });
    }) as typeof globalThis.fetch;

    const input = findRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Status",
      value: "Open",
    });
    const { data: result } = await findRows.run(input, { fetch: fakeFetch });

    // case-insensitive match -> rows 2 and 4 (data starts at row 2)
    expect(result.match_count).toBe(2);
    expect(result.rows).toEqual([
      { row_number: 2, values: { Name: "Sam", Status: "Open", Amount: "10" } },
      { row_number: 4, values: { Name: "Mo", Status: "open", Amount: "30" } },
    ]);
    expect(findRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("caps results at row_count", async () => {
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      if (url.includes("!1%3A1") || url.includes("!1:1")) {
        return jsonResponse({ values: [["Status"]] });
      }
      return jsonResponse({
        values: [["Open"], ["Open"], ["Open"]],
      });
    }) as typeof globalThis.fetch;

    const input = findRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Status",
      value: "Open",
      row_count: 2,
    });
    const { data: result } = await findRows.run(input, { fetch: fakeFetch });
    expect(result.match_count).toBe(2);
    expect(result.rows.map((r) => r.row_number)).toEqual([2, 3]);
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, status: "PERMISSION_DENIED", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;
    const input = findRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      column: "Status",
      value: "Open",
    });
    const err = await findRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
