import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createSpreadsheet from "../scripts/createSpreadsheet.ts";

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
  spreadsheetId: "1New",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1New/edit",
  properties: { title: "My Sheet" },
  sheets: [{ properties: { sheetId: 0, title: "Sheet1", index: 0 } }],
};

describe("createSpreadsheet: run", () => {
  it("POSTs to /spreadsheets with the title in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = createSpreadsheet.inputSchema.parse({ title: "My Sheet" });
    const { data: result } = await createSpreadsheet.run(input, {
      fetch: fakeFetch,
    });

    const { url, init } = calls[0]!;
    expect(url).toBe("https://sheets.googleapis.com/v4/spreadsheets");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.properties.title).toBe("My Sheet");
    expect(result.spreadsheet_id).toBe("1New");
    expect(result.spreadsheet_url).toBe(
      "https://docs.google.com/spreadsheets/d/1New/edit",
    );
    expect(result.worksheets).toEqual([
      { sheet_id: 0, title: "Sheet1", index: 0 },
    ]);
    expect(createSpreadsheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("writes a header row to the first worksheet when headers are provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // First call is the create POST; the follow-up is the values PUT.
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = createSpreadsheet.inputSchema.parse({
      title: "My Sheet",
      headers: ["Date", "Amount", "Category"],
    });
    await createSpreadsheet.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(2);
    const create = calls[0]!;
    expect(create.url).toBe("https://sheets.googleapis.com/v4/spreadsheets");
    expect(create.init?.method).toBe("POST");

    const write = calls[1]!;
    expect(write.url).toContain("/spreadsheets/1New/values/");
    expect(write.url).toContain("valueInputOption=USER_ENTERED");
    expect(write.init?.method).toBe("PUT");
    expect(JSON.parse(write.init?.body as string)).toEqual({
      values: [["Date", "Amount", "Category"]],
    });
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 400, status: "INVALID_ARGUMENT", message: "bad" } },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const input = createSpreadsheet.inputSchema.parse({ title: "My Sheet" });
    const err = await createSpreadsheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
