import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import formatCells from "../skills/google-sheets-plg/scripts/formatCells.ts";

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

function resolveThenOk(
  calls: Array<{ url: string; init: RequestInit | undefined }>,
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes(":batchUpdate")) return jsonResponse({ replies: [{}] });
    return jsonResponse({
      sheets: [{ properties: { sheetId: 42, title: "Sheet1" } }],
    });
  }) as typeof globalThis.fetch;
}

describe("formatCells: run", () => {
  it("resolves the sheetId, then POSTs a repeatCell with backgroundColor + a fields mask", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = formatCells.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A1:C10",
      background_color: "#FF0000",
    });
    const { data: result } = await formatCells.run(input, { fetch: fakeFetch });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const repeatCell = JSON.parse(batch.init?.body as string).requests[0]
      .repeatCell;
    expect(repeatCell.range.sheetId).toBe(42);
    expect(repeatCell.cell.userEnteredFormat.backgroundColor).toEqual({
      red: 1,
      green: 0,
      blue: 0,
    });
    expect(repeatCell.fields).toContain("userEnteredFormat.backgroundColor");

    expect(result).toEqual({ formatted_range: "A1:C10" });
    expect(formatCells.outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws when no formatting is specified", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);
    const input = formatCells.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A1:C10",
    });
    await expect(formatCells.run(input, { fetch: fakeFetch })).rejects.toThrow(
      /No formatting specified/,
    );
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
    const input = formatCells.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A1:C10",
      bold: true,
    });
    const err = await formatCells
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
