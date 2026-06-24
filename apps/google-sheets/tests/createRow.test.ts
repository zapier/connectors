import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createRow from "../scripts/createRow.ts";

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

describe("createRow: run (append)", () => {
  it("reads headers, appends with INSERT_ROWS, and returns the landing row number", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":append")) {
        return jsonResponse({ updates: { updatedRange: "'Sheet1'!A5:C5" } });
      }
      // header read (row 1)
      return jsonResponse({ values: [["Name", "Status", "Amount"]] });
    }) as typeof globalThis.fetch;

    const input = createRow.inputSchema.parse({
      spreadsheet: "https://docs.google.com/spreadsheets/d/1AbC/edit",
      worksheet: "Sheet1",
      values: { Name: "Sam", Status: "Open" },
    });
    const { data: result } = await createRow.run(input, { fetch: fakeFetch });

    // The id was extracted from the pasted URL.
    expect(calls[0]?.url).toContain("/spreadsheets/1AbC/");
    // Append targets the header anchor with INSERT_ROWS + USER_ENTERED.
    const appendCall = calls.find((c) => c.url.includes(":append"))!;
    expect(appendCall.url).toContain("insertDataOption=INSERT_ROWS");
    expect(appendCall.url).toContain("valueInputOption=USER_ENTERED");
    // Cells are ordered by header, blank-filling the unnamed "Amount" column.
    expect(JSON.parse(appendCall.init?.body as string)).toEqual({
      values: [["Sam", "Open", ""]],
    });
    expect(result.row_number).toBe(5);
    expect(createRow.outputSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a value keyed by an unknown header", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        values: [["Name", "Status"]],
      })) as typeof globalThis.fetch;
    const input = createRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      values: { Nope: "x" },
    });
    await expect(createRow.run(input, { fetch: fakeFetch })).rejects.toThrow(
      /Unknown column header/,
    );
  });

  it("surfaces a ConnectorHttpError on a non-OK header read", async () => {
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
    const input = createRow.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      values: { Name: "Sam" },
    });
    const err = await createRow
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});

describe("createRow: governance", () => {
  it("is a non-destructive write", () => {
    expect(createRow.annotations?.readOnlyHint).toBe(false);
    expect(createRow.annotations?.destructiveHint).toBe(false);
  });
});
