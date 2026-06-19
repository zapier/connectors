import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getSpreadsheet from "../scripts/getSpreadsheet.ts";

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

const CANNED = {
  spreadsheetId: "1AbC",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1AbC/edit",
  properties: { title: "T" },
  sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }],
};

describe("getSpreadsheet: run", () => {
  it("GETs the spreadsheet metadata and returns it", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = getSpreadsheet.inputSchema.parse({ spreadsheetId: "1AbC" });
    const { data: result } = await getSpreadsheet.run(input, {
      fetch: fakeFetch,
    });

    const { url, init } = calls[0]!;
    expect(url).toContain("https://sheets.googleapis.com/v4/");
    expect(url).toContain("/spreadsheets/1AbC");
    expect(init?.method).toBe("GET");
    expect(getSpreadsheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("accepts a full Sheets URL and normalizes the id in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = getSpreadsheet.inputSchema.parse({
      spreadsheetId: "https://docs.google.com/spreadsheets/d/1AbC/edit#gid=0",
    });
    await getSpreadsheet.run(input, { fetch: fakeFetch });

    expect(calls[0]!.url).toContain("/spreadsheets/1AbC");
    expect(calls[0]!.url).not.toContain("docs.google.com");
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "missing" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const input = getSpreadsheet.inputSchema.parse({ spreadsheetId: "1AbC" });
    const err = await getSpreadsheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
