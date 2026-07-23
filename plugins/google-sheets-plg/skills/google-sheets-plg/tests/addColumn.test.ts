import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addColumn from "../skills/google-sheets-plg/scripts/addColumn.ts";

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

describe("addColumn: run", () => {
  it("inserts at an explicit index via insertDimension", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":batchUpdate")) return jsonResponse({ replies: [{}] });
      return jsonResponse({
        sheets: [{ properties: { sheetId: 42, title: "Sheet1" } }],
      });
    }) as typeof globalThis.fetch;

    const input = addColumn.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      index: 2,
    });
    const { data: result } = await addColumn.run(input, { fetch: fakeFetch });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const insert = JSON.parse(batch.init?.body as string).requests[0]
      .insertDimension;
    expect(insert.range.sheetId).toBe(42);
    expect(insert.range.dimension).toBe("COLUMNS");
    expect(insert.range.startIndex).toBe(2);
    expect(insert.range.endIndex).toBe(3);

    expect(result).toEqual({
      spreadsheet_id: "1AbC",
      sheet_id: 42,
      header_written: false,
    });
    expect(addColumn.outputSchema.safeParse(result).success).toBe(true);
  });

  it("appends with appendDimension when index is omitted, and writes a header when supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":batchUpdate")) return jsonResponse({ replies: [{}] });
      if (url.includes("/values/")) return jsonResponse({});
      // resolveSheetId (no gridProperties field) AND the appended-column re-fetch
      // both hit the GET ?fields= path; return both shapes.
      return jsonResponse({
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "Sheet1",
              gridProperties: { columnCount: 5 },
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = addColumn.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      header: "Region",
    });
    const { data: result } = await addColumn.run(input, { fetch: fakeFetch });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    const append = JSON.parse(batch.init?.body as string).requests[0]
      .appendDimension;
    expect(append.sheetId).toBe(42);
    expect(append.dimension).toBe("COLUMNS");
    expect(append.length).toBe(1);

    const put = calls.find((c) => c.url.includes("/values/"))!;
    expect(put.init?.method).toBe("PUT");
    expect(JSON.parse(put.init?.body as string)).toEqual({
      values: [["Region"]],
    });
    expect(result.header_written).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK resolve", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "no access",
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;
    const input = addColumn.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      index: 2,
    });
    const err = await addColumn
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
