import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import clearRows from "../skills/google-sheets-plg/scripts/clearRows.ts";

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

describe("clearRows: run (values:batchClear)", () => {
  it("POSTs full-row ranges for the input rows and echoes cleared_rows", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        clearedRanges: ["'Sheet1'!A2:Z2", "'Sheet1'!A4:Z4"],
      });
    }) as typeof globalThis.fetch;

    const input = clearRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [2, 4],
    });
    const { data: result } = await clearRows.run(input, { fetch: fakeFetch });

    // No header read for clearRows — it goes straight to batchClear.
    expect(calls.length).toBe(1);
    const op = calls[0]!;
    expect(op.url).toContain("values:batchClear");
    expect(op.init?.method).toBe("POST");
    expect(JSON.parse(op.init?.body as string)).toEqual({
      ranges: ["'Sheet1'!2:2", "'Sheet1'!4:4"],
    });
    expect(result.cleared_rows).toEqual([2, 4]);
    expect(clearRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK clear", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 403, status: "PERMISSION_DENIED", message: "no edit" },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;
    const input = clearRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [2],
    });
    const err = await clearRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});

describe("clearRows: governance", () => {
  it("is a destructive write", () => {
    expect(clearRows.annotations?.readOnlyHint).toBe(false);
    expect(clearRows.annotations?.destructiveHint).toBe(true);
  });
});
