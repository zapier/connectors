import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import clearValues from "../scripts/clearValues.ts";

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

describe("clearValues: run", () => {
  it("POSTs to the :clear endpoint and returns the cleared range", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        spreadsheetId: "1AbC",
        clearedRange: "Sheet1!A1:B2",
      });
    }) as typeof globalThis.fetch;

    const input = clearValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
    });
    const { data: result } = await clearValues.run(input, { fetch: fakeFetch });

    const { url, init } = calls[0]!;
    expect(url).toContain("https://sheets.googleapis.com/v4/");
    expect(url).toContain("/spreadsheets/1AbC/values/");
    expect(url).toContain(":clear");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({});
    expect(clearValues.outputSchema.safeParse(result).success).toBe(true);
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
    const input = clearValues.inputSchema.parse({
      spreadsheet: "1AbC",
      range: "Sheet1!A1:B2",
    });
    const err = await clearValues
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
