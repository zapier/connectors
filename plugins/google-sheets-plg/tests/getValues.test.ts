import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getValues from "../skills/google-sheets-plg/scripts/getValues.ts";

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

describe("getValues: run", () => {
  it("GETs the values range and returns the 2-D values", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        range: "Sheet1!A1:B2",
        majorDimension: "ROWS",
        values: [
          ["a", "b"],
          ["c", "d"],
        ],
      });
    }) as typeof globalThis.fetch;

    const input = getValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
    });
    const { data: result } = await getValues.run(input, { fetch: fakeFetch });

    const url = calls[0]!.url;
    expect(url).toContain("https://sheets.googleapis.com/v4/");
    expect(url).toContain("/spreadsheets/1AbC/values/");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(getValues.outputSchema.safeParse(result).success).toBe(true);
  });

  it("applies default majorDimension=ROWS and valueRenderOption=FORMATTED_VALUE when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        range: "Sheet1!A1:B2",
        majorDimension: "ROWS",
        values: [["a"]],
      });
    }) as typeof globalThis.fetch;

    const input = getValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
    });
    await getValues.run(input, { fetch: fakeFetch });

    const url = calls[0]!.url;
    expect(url).toContain("majorDimension=ROWS");
    expect(url).toContain("valueRenderOption=FORMATTED_VALUE");
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "slow" } },
        { status: 429 },
      )) as typeof globalThis.fetch;
    const input = getValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
    });
    const err = await getValues
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(429);
  });
});
