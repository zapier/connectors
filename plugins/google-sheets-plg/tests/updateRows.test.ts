import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateRows from "../skills/google-sheets-plg/scripts/updateRows.ts";

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

describe("updateRows: run (one batched values:batchUpdate)", () => {
  it("flattens per-row runs into one batchUpdate and reports totals", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (calls.length === 1) {
        return jsonResponse({ values: [["A", "B", "C", "D"]] });
      }
      return jsonResponse({ totalUpdatedCells: 4 });
    }) as typeof globalThis.fetch;

    const input = updateRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [
        { row_number: 2, values: { A: "1", D: "4" } },
        { row_number: 5, values: { A: "9", B: "8" } },
      ],
    });
    const { data: result } = await updateRows.run(input, { fetch: fakeFetch });

    // One op call (the batchUpdate) after the header read.
    expect(calls.length).toBe(2);
    const op = calls[1]!;
    expect(op.url).toContain("values:batchUpdate");
    expect(op.init?.method).toBe("POST");
    const body = JSON.parse(op.init?.body as string) as {
      valueInputOption: string;
      data: { range: string; values: unknown[][] }[];
    };
    expect(body.valueInputOption).toBe("USER_ENTERED");
    // row 2: A and D are non-contiguous -> two ranges; row 5: A,B contiguous -> one.
    expect(body.data).toEqual([
      { range: "'Sheet1'!A2:A2", values: [["1"]] },
      { range: "'Sheet1'!D2:D2", values: [["4"]] },
      { range: "'Sheet1'!A5:B5", values: [["9", "8"]] },
    ]);
    // Gap columns never spanned.
    for (const d of body.data) {
      expect(d.range).not.toMatch(/B2|C2|C5/);
    }

    expect(result.updated_row_count).toBe(2);
    expect(result.updated_cells).toBe(4);
    expect(updateRows.outputSchema.safeParse(result).success).toBe(true);
  });

  it("surfaces a ConnectorHttpError on a non-OK batchUpdate", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (calls.length === 1) {
        return jsonResponse({ values: [["A", "B"]] });
      }
      return jsonResponse(
        {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            message: "bad range",
          },
        },
        { status: 400 },
      );
    }) as typeof globalThis.fetch;

    const input = updateRows.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      rows: [{ row_number: 2, values: { A: "1" } }],
    });
    const err = await updateRows
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
