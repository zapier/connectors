import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listWorksheets from "../scripts/listWorksheets.ts";

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

describe("listWorksheets: run", () => {
  it("GETs with a sheets.properties field mask and maps the tabs", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: "Sheet1",
              index: 0,
              gridProperties: { rowCount: 1000, columnCount: 26 },
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = listWorksheets.inputSchema.parse({ spreadsheet: "1AbC" });
    const { data: result } = await listWorksheets.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/spreadsheets/1AbC?fields=");
    expect(decodeURIComponent(calls[0]!.url)).toContain(
      "sheets.properties(sheetId,title,index,gridProperties)",
    );

    expect(result).toEqual({
      worksheets: [
        {
          sheet_id: 0,
          title: "Sheet1",
          index: 0,
          row_count: 1000,
          column_count: 26,
        },
      ],
    });
    expect(listWorksheets.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "no sheet" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const input = listWorksheets.inputSchema.parse({ spreadsheet: "1AbC" });
    const err = await listWorksheets
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});

describe("listWorksheets: governance", () => {
  it("is a read-only operation", () => {
    expect(listWorksheets.annotations?.readOnlyHint).toBe(true);
  });
});
