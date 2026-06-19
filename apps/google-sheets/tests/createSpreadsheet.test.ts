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
  sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }],
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

    const input = createSpreadsheet.inputSchema.parse({
      properties: { title: "My Sheet" },
    });
    const { data: result } = await createSpreadsheet.run(input, {
      fetch: fakeFetch,
    });

    const { url, init } = calls[0]!;
    expect(url).toBe("https://sheets.googleapis.com/v4/spreadsheets");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      properties: { title: "My Sheet" },
    });
    expect(createSpreadsheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 400, status: "INVALID_ARGUMENT", message: "bad" } },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const input = createSpreadsheet.inputSchema.parse({
      properties: { title: "My Sheet" },
    });
    const err = await createSpreadsheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
