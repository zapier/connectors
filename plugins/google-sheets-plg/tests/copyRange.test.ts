import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import copyRange from "../skills/google-sheets-plg/scripts/copyRange.ts";

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

describe("copyRange: run", () => {
  it("POSTs a copyPaste request and prefixes the pasteType (VALUES -> PASTE_VALUES)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = copyRange.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      source_range: "A1:C10",
      destination_range: "E1",
      paste_type: "VALUES",
    });
    const { data: result } = await copyRange.run(input, { fetch: fakeFetch });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const copyPaste = JSON.parse(batch.init?.body as string).requests[0]
      .copyPaste;
    expect(copyPaste.source.sheetId).toBe(42);
    expect(copyPaste.destination.sheetId).toBe(42);
    expect(copyPaste.pasteType).toBe("PASTE_VALUES");

    expect(result).toEqual({ destination_range: "E1" });
    expect(copyRange.outputSchema.safeParse(result).success).toBe(true);
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
    const input = copyRange.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      source_range: "A1:C10",
      destination_range: "E1",
    });
    const err = await copyRange
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
