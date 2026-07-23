import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listRows from "../scripts/listRows.ts";

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

describe("listRows: run (bounded window read)", () => {
  it("maps the window to records; next_start_row is null when the page is short", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (calls.length === 1) {
        return jsonResponse({ values: [["Name", "Email"]] });
      }
      // fewer rows than row_count (25) requested -> worksheet exhausted
      return jsonResponse({
        values: [
          ["Sam", "a@x.com"],
          ["Lee"], // ragged row -> right-padded
        ],
      });
    }) as typeof globalThis.fetch;

    const input = listRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
    });
    const { data: result } = await listRows.run(input, { fetch: fakeFetch });

    expect(result.rows).toEqual([
      { row_number: 2, values: { Name: "Sam", Email: "a@x.com" } },
      { row_number: 3, values: { Name: "Lee", Email: "" } },
    ]);
    expect(result.next_start_row).toBeNull();
    expect(listRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("returns a numeric next_start_row when a full page comes back", async () => {
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      if (url.includes("!1%3A1") || url.includes("!1:1")) {
        return jsonResponse({ values: [["Name"]] });
      }
      // exactly row_count (2) rows -> a full page
      return jsonResponse({ values: [["a"], ["b"]] });
    }) as typeof globalThis.fetch;

    const input = listRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      start_row: 2,
      row_count: 2,
    });
    const { data: result } = await listRows.run(input, { fetch: fakeFetch });

    expect(result.rows.map((r) => r.row_number)).toEqual([2, 3]);
    expect(result.next_start_row).toBe(4);
    expect(listRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "no sheet" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const input = listRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
    });
    const err = await listRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
