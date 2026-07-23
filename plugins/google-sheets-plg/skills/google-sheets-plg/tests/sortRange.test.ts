import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import sortRange from "../scripts/sortRange.ts";

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

describe("sortRange: run", () => {
  it("maps a column letter to dimensionIndex and carries the sortOrder", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = sortRange.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:D100",
      sort_specs: [{ column: "B", order: "DESCENDING" }],
    });
    const { data: result } = await sortRange.run(input, { fetch: fakeFetch });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const sort = JSON.parse(batch.init?.body as string).requests[0].sortRange;
    expect(sort.range.sheetId).toBe(42);
    expect(sort.sortSpecs[0].dimensionIndex).toBe(1);
    expect(sort.sortSpecs[0].sortOrder).toBe("DESCENDING");

    expect(result).toEqual({ sorted_range: "A2:D100" });
    expect(sortRange.outputSchema.safeParse(result).success).toBe(true);
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
    const input = sortRange.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:D100",
      sort_specs: [{ column: "A", order: "ASCENDING" }],
    });
    const err = await sortRange
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
