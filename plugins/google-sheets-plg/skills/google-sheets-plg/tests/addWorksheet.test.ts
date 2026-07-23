import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addWorksheet from "../skills/google-sheets-plg/scripts/addWorksheet.ts";

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

describe("addWorksheet: run", () => {
  it("POSTs an addSheet batchUpdate and returns the new sheet id/index", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        replies: [
          { addSheet: { properties: { sheetId: 7, title: "New", index: 1 } } },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = addWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      title: "New",
    });
    const { data: result } = await addWorksheet.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]?.url).toContain("/spreadsheets/1AbC:batchUpdate");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.requests[0].addSheet.properties.title).toBe("New");

    expect(result).toEqual({
      sheet_id: 7,
      title: "New",
      index: 1,
      spreadsheet_id: "1AbC",
    });
    expect(addWorksheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("writes a header row with a second PUT when headers are supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        replies: [
          { addSheet: { properties: { sheetId: 7, title: "New", index: 1 } } },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = addWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      title: "New",
      headers: ["Name", "Status"],
    });
    await addWorksheet.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(2);
    const putCall = calls[1];
    expect(putCall.init?.method).toBe("PUT");
    expect(putCall.url).toContain("/values/");
    expect(putCall.url).toContain("valueInputOption=USER_ENTERED");
    expect(JSON.parse(putCall.init?.body as string)).toEqual({
      values: [["Name", "Status"]],
    });
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            message: "dup title",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const input = addWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      title: "New",
    });
    const err = await addWorksheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
