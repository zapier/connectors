import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteWorksheet from "../skills/google-sheets-plg/scripts/deleteWorksheet.ts";

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

describe("deleteWorksheet: run", () => {
  it("resolves the sheetId, then POSTs a deleteSheet batchUpdate", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":batchUpdate")) {
        return jsonResponse({ replies: [{}] });
      }
      // resolveSheetId resolution
      return jsonResponse({
        sheets: [{ properties: { sheetId: 42, title: "Sheet1" } }],
      });
    }) as typeof globalThis.fetch;

    const input = deleteWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
    });
    const { data: result } = await deleteWorksheet.run(input, {
      fetch: fakeFetch,
    });

    // First call resolves the sheetId.
    expect(calls[0]?.url).toContain("fields=sheets.properties");
    // Second call is the delete batchUpdate.
    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    expect(batch.url).toContain("/spreadsheets/1AbC:batchUpdate");
    const body = JSON.parse(batch.init?.body as string);
    expect(body.requests[0].deleteSheet.sheetId).toBe(42);

    expect(result).toEqual({ deleted: true, sheet_id: 42, title: "Sheet1" });
    expect(deleteWorksheet.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK resolve", async () => {
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
    const input = deleteWorksheet.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
    });
    const err = await deleteWorksheet
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});

describe("deleteWorksheet: governance", () => {
  it("is a destructive write", () => {
    expect(deleteWorksheet.annotations?.destructiveHint).toBe(true);
  });
});
