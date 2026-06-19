import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import copyWorksheet from "../scripts/copyWorksheet.ts";

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

const CANNED = { sheetId: 123, title: "Copy of Sheet1", index: 1 };

describe("copyWorksheet: run", () => {
  it("POSTs to :copyTo with the destination in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = copyWorksheet.inputSchema.parse({
      spreadsheetId: "1AbC",
      sheetId: 0,
      destinationSpreadsheetId: "1Dest",
    });
    const { data: result } = await copyWorksheet.run(input, {
      fetch: fakeFetch,
    });

    const { url, init } = calls[0]!;
    expect(url).toContain("https://sheets.googleapis.com/v4/");
    expect(url).toContain("/spreadsheets/1AbC/sheets/0:copyTo");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      destinationSpreadsheetId: "1Dest",
    });
    expect(copyWorksheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("normalizes both the source and destination spreadsheet ids from URLs", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = copyWorksheet.inputSchema.parse({
      spreadsheetId: "https://docs.google.com/spreadsheets/d/1AbC/edit",
      sheetId: 0,
      destinationSpreadsheetId:
        "https://docs.google.com/spreadsheets/d/1Dest/edit#gid=5",
    });
    await copyWorksheet.run(input, { fetch: fakeFetch });

    const { url, init } = calls[0]!;
    expect(url).toContain("/spreadsheets/1AbC/sheets/0:copyTo");
    expect(url).not.toContain("docs.google.com");
    expect(JSON.parse(init?.body as string)).toEqual({
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
      spreadsheetId: "1AbC",
      sheetId: 0,
      destinationSpreadsheetId: "1Dest",
    });
    const err = await copyWorksheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
