import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateWorksheetProperties from "../skills/google-sheets-plg/scripts/updateWorksheetProperties.ts";

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

describe("updateWorksheetProperties: run", () => {
  it("builds an updateSheetProperties request with a fields mask covering each changed prop", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = updateWorksheetProperties.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      new_title: "Renamed",
      frozen_row_count: 1,
    });
    const { data: result } = await updateWorksheetProperties.run(input, {
      fetch: fakeFetch,
    });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const req = JSON.parse(batch.init?.body as string).requests[0]
      .updateSheetProperties;
    expect(req.fields).toContain("title");
    expect(req.fields).toContain("gridProperties.frozenRowCount");
    expect(req.properties.sheetId).toBe(42);
    expect(req.properties.title).toBe("Renamed");
    expect(req.properties.gridProperties.frozenRowCount).toBe(1);

    expect(result.title).toBe("Renamed");
    expect(
      updateWorksheetProperties.outputSchema.safeParse(result).success,
    ).toBe(true);
  });

  it("throws when no property fields are provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);
    const input = updateWorksheetProperties.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
    });
    await expect(
      updateWorksheetProperties.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/at least one property/);
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
    const input = updateWorksheetProperties.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      new_title: "Renamed",
    });
    const err = await updateWorksheetProperties
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
