import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import copyWorksheet from "../skills/google-sheets-plg/scripts/copyWorksheet.ts";

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

const RESOLVE = { sheets: [{ properties: { sheetId: 42, title: "Sheet1" } }] };
const COPIED = { sheetId: 123, title: "Copy of Sheet1", index: 1 };

describe("copyWorksheet: run", () => {
  it("resolves the worksheet title to a gid then POSTs to :copyTo", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (!url.includes(":copyTo")) return jsonResponse(RESOLVE);
      return jsonResponse(COPIED);
    }) as typeof globalThis.fetch;

    const input = copyWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      destination_spreadsheet: "1Dest",
    });
    const { data: result } = await copyWorksheet.run(input, {
      fetch: fakeFetch,
    });

    // First call resolves the title -> gid.
    expect(calls[0]!.url).toContain("/spreadsheets/1AbC");
    expect(calls[0]!.url).toContain("fields=sheets.properties");

    // Second call copies the resolved gid (42) to the destination.
    const copy = calls[1]!;
    expect(copy.url).toContain("https://sheets.googleapis.com/v4/");
    expect(copy.url).toContain("/spreadsheets/1AbC/sheets/42:copyTo");
    expect(copy.init?.method).toBe("POST");
    expect(JSON.parse(copy.init?.body as string)).toEqual({
      destinationSpreadsheetId: "1Dest",
    });

    expect(result.sheet_id).toBe(123);
    expect(copyWorksheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("normalizes both the source and destination spreadsheet ids from URLs", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (!url.includes(":copyTo")) return jsonResponse(RESOLVE);
      return jsonResponse(COPIED);
    }) as typeof globalThis.fetch;

    const input = copyWorksheet.inputSchema.parse({
      spreadsheet: "https://docs.google.com/spreadsheets/d/1AbC/edit",
      worksheet: "Sheet1",
      destination_spreadsheet:
        "https://docs.google.com/spreadsheets/d/1Dest/edit#gid=5",
    });
    await copyWorksheet.run(input, { fetch: fakeFetch });

    const copy = calls[1]!;
    expect(copy.url).toContain("/spreadsheets/1AbC/sheets/42:copyTo");
    expect(copy.url).not.toContain("docs.google.com");
    expect(JSON.parse(copy.init?.body as string)).toEqual({
      destinationSpreadsheetId: "1Dest",
    });
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
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
    const input = copyWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      destination_spreadsheet: "1Dest",
    });
    const err = await copyWorksheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
