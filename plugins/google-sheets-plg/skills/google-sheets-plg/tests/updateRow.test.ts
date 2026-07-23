import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateRow from "../skills/google-sheets-plg/scripts/updateRow.ts";

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

describe("updateRow: run (no-clobber partial write)", () => {
  it("writes a single contiguous run as one PUT to the A:B range", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (calls.length === 1) {
        // header read
        return jsonResponse({ values: [["A", "B", "C", "D"]] });
      }
      return jsonResponse({ updatedCells: 2 });
    }) as typeof globalThis.fetch;

    const input = updateRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      row_number: 5,
      values: { A: "1", B: "2" },
    });
    const { data: result } = await updateRow.run(input, { fetch: fakeFetch });

    // Exactly one op call (the PUT) after the header read.
    expect(calls.length).toBe(2);
    const op = calls[1]!;
    expect(op.init?.method).toBe("PUT");
    const opUrl = decodeURIComponent(op.url);
    expect(opUrl).toContain("'Sheet1'!A5:B5");
    expect(opUrl).toContain("valueInputOption=USER_ENTERED");
    expect(JSON.parse(op.init?.body as string)).toEqual({
      values: [["1", "2"]],
    });

    expect(result.row_number).toBe(5);
    expect(result.updated_cells).toBe(2);
    expect(result.values).toEqual({ A: "1", B: "2" });
    expect(updateRow.outputSchema.safeParse(result).success).toBe(true);
  });

  it("does NOT span the gap columns: A and D become two batchUpdate ranges", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (calls.length === 1) {
        return jsonResponse({ values: [["A", "B", "C", "D"]] });
      }
      return jsonResponse({ totalUpdatedCells: 2 });
    }) as typeof globalThis.fetch;

    const input = updateRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      row_number: 5,
      values: { A: "1", D: "4" },
    });
    const { data: result } = await updateRow.run(input, { fetch: fakeFetch });

    const op = calls[1]!;
    expect(op.url).toContain("values:batchUpdate");
    expect(op.init?.method).toBe("POST");
    const body = JSON.parse(op.init?.body as string) as {
      valueInputOption: string;
      data: { range: string; values: unknown[][] }[];
    };
    expect(body.valueInputOption).toBe("USER_ENTERED");
    expect(body.data).toEqual([
      { range: "'Sheet1'!A5:A5", values: [["1"]] },
      { range: "'Sheet1'!D5:D5", values: [["4"]] },
    ]);
    // The gap columns B and C are never written.
    for (const d of body.data) {
      expect(d.range).not.toMatch(/B5|C5/);
    }
    expect(result.updated_cells).toBe(2);
    expect(updateRow.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "no sheet" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const input = updateRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      row_number: 5,
      values: { A: "1" },
    });
    const err = await updateRow
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
