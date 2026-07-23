import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createRows from "../skills/google-sheets-plg/scripts/createRows.ts";

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

describe("createRows: run (batched append)", () => {
  it("appends many rows in one :append and parses the landing range", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":append")) {
        return jsonResponse({ updates: { updatedRange: "'Sheet1'!A5:C7" } });
      }
      // header read (row 1)
      return jsonResponse({ values: [["Name", "Status", "Amount"]] });
    }) as typeof globalThis.fetch;

    const input = createRows.inputSchema.parse({
      spreadsheet: "https://docs.google.com/spreadsheets/d/1AbC/edit",
      worksheet: "Sheet1",
      rows: [
        { Name: "Sam", Status: "Open" },
        { Name: "Lee", Status: "Done", Amount: 42 },
        { Name: "Mo" },
      ],
    });
    const { data: result } = await createRows.run(input, { fetch: fakeFetch });

    const appendCall = calls.find((c) => c.url.includes(":append"))!;
    expect(appendCall.url).toContain("insertDataOption=INSERT_ROWS");
    expect(appendCall.url).toContain("valueInputOption=USER_ENTERED");
    // All rows in one body, header-ordered with blank-fill.
    expect(JSON.parse(appendCall.init?.body as string)).toEqual({
      values: [
        ["Sam", "Open", ""],
        ["Lee", "Done", 42],
        ["Mo", "", ""],
      ],
    });

    expect(result.row_count).toBe(3);
    expect(result.first_row_number).toBe(5);
    expect(result.last_row_number).toBe(7);
    expect(createRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a value keyed by an unknown header", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        values: [["Name", "Status", "Amount"]],
      })) as typeof globalThis.fetch;
    const input = createRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [{ Nope: "x" }],
    });
    await expect(createRows.run(input, { fetch: fakeFetch })).rejects.toThrow(
      /Unknown column header/,
    );
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
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
    const input = createRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [{ Name: "Sam" }],
    });
    const err = await createRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
