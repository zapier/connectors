import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateValues from "../scripts/updateValues.ts";

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

describe("updateValues: run", () => {
  it("PUTs the 2-D values to the range and returns the update summary", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        spreadsheetId: "1AbC",
        updatedRange: "Sheet1!A1:B2",
        updatedRows: 2,
        updatedColumns: 2,
        updatedCells: 4,
      });
    }) as typeof globalThis.fetch;

    const input = updateValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
      values: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
    const { data: result } = await updateValues.run(input, {
      fetch: fakeFetch,
    });

    const { url, init } = calls[0]!;
    expect(url).toContain("https://sheets.googleapis.com/v4/");
    expect(url).toContain("/spreadsheets/1AbC/values/");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({
      range: "Sheet1!A1:B2",
      majorDimension: "ROWS",
      values: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
    expect(updateValues.outputSchema.safeParse(result).success).toBe(true);
  });

  it("defaults valueInputOption to USER_ENTERED in the URL", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ spreadsheetId: "1AbC", updatedRange: "Sheet1!A1" });
    }) as typeof globalThis.fetch;

    const input = updateValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1",
      values: [["x"]],
    });
    await updateValues.run(input, { fetch: fakeFetch });

    expect(calls[0]!.url).toContain("valueInputOption=USER_ENTERED");
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            message: "bad range",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const input = updateValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
      values: [["a"]],
    });
    const err = await updateValues
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
