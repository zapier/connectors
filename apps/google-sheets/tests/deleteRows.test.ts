import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteRows from "../scripts/deleteRows.ts";

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

describe("deleteRows: run (resolve sheetId then batchUpdate)", () => {
  it("deletes rows DESCENDING via deleteDimension(ROWS) on the resolved sheetId", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes("fields=sheets.properties")) {
        return jsonResponse({
          sheets: [
            { properties: { sheetId: 777, title: "Sheet1" } },
            { properties: { sheetId: 12, title: "Other" } },
          ],
        });
      }
      return jsonResponse({ replies: [] });
    }) as typeof globalThis.fetch;

    const input = deleteRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [3, 7, 5],
    });
    const { data: result } = await deleteRows.run(input, { fetch: fakeFetch });

    // First call resolves the sheetId.
    expect(calls[0]?.url).toContain("fields=sheets.properties");
    const op = calls[1]!;
    expect(op.url).toContain(":batchUpdate");
    expect(op.init?.method).toBe("POST");
    const body = JSON.parse(op.init?.body as string) as {
      requests: {
        deleteDimension: {
          range: {
            sheetId: number;
            dimension: string;
            startIndex: number;
            endIndex: number;
          };
        };
      }[];
    };
    // Sorted DESC (7,5,3) so earlier deletes don't shift later indices.
    expect(
      body.requests.map((r) => r.deleteDimension.range.startIndex),
    ).toEqual([6, 4, 2]);
    expect(body.requests.map((r) => r.deleteDimension.range.endIndex)).toEqual([
      7, 5, 3,
    ]);
    for (const r of body.requests) {
      expect(r.deleteDimension.range.sheetId).toBe(777);
      expect(r.deleteDimension.range.dimension).toBe("ROWS");
    }
    // Output echoes the input order (not the descending send order).
    expect(result.deleted_rows).toEqual([3, 7, 5]);
    expect(deleteRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK sheetId resolve", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const input = deleteRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [3],
    });
    const err = await deleteRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});

describe("deleteRows: governance", () => {
  it("is a destructive write", () => {
    expect(deleteRows.annotations?.readOnlyHint).toBe(false);
    expect(deleteRows.annotations?.destructiveHint).toBe(true);
  });
});
