import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addConditionalFormatRule from "../scripts/addConditionalFormatRule.ts";

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

describe("addConditionalFormatRule: run", () => {
  it("adds a booleanRule at index 0 with a TEXT_CONTAINS condition carrying its value", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = addConditionalFormatRule.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      condition_type: "TEXT_CONTAINS",
      condition_value: "x",
      background_color: "#FF0000",
    });
    const { data: result } = await addConditionalFormatRule.run(input, {
      fetch: fakeFetch,
    });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const req = JSON.parse(batch.init?.body as string).requests[0]
      .addConditionalFormatRule;
    expect(req.index).toBe(0);
    expect(req.rule.ranges[0].sheetId).toBe(42);
    expect(req.rule.booleanRule.condition.type).toBe("TEXT_CONTAINS");
    expect(req.rule.booleanRule.condition.values).toEqual([
      { userEnteredValue: "x" },
    ]);

    expect(result).toEqual({ rule_added: true });
    expect(
      addConditionalFormatRule.outputSchema.safeParse(result).success,
    ).toBe(true);
  });

  it("throws when a value-bearing condition type has no condition_value", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);
    const input = addConditionalFormatRule.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      condition_type: "TEXT_CONTAINS",
      background_color: "#FF0000",
    });
    await expect(
      addConditionalFormatRule.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/requires condition_value/);
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
    const input = addConditionalFormatRule.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      condition_type: "TEXT_CONTAINS",
      condition_value: "x",
      background_color: "#FF0000",
    });
    const err = await addConditionalFormatRule
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
