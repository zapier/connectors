import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import setDataValidation from "../skills/google-sheets-plg/scripts/setDataValidation.ts";

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

describe("setDataValidation: run", () => {
  it("builds a ONE_OF_LIST condition with the list values as userEnteredValue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);

    const input = setDataValidation.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      rule_type: "ONE_OF_LIST",
      list_values: ["A", "B"],
    });
    const { data: result } = await setDataValidation.run(input, {
      fetch: fakeFetch,
    });

    const batch = calls.find((c) => c.url.includes(":batchUpdate"))!;
    expect(batch.init?.method).toBe("POST");
    const rule = JSON.parse(batch.init?.body as string).requests[0]
      .setDataValidation.rule;
    expect(rule.condition.type).toBe("ONE_OF_LIST");
    expect(rule.condition.values).toEqual([
      { userEnteredValue: "A" },
      { userEnteredValue: "B" },
    ]);

    expect(result).toEqual({ validated_range: "A2:A100" });
    expect(setDataValidation.outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws BEFORE any fetch when ONE_OF_LIST has empty list_values", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = resolveThenOk(calls);
    const input = setDataValidation.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      rule_type: "ONE_OF_LIST",
      list_values: [],
    });
    await expect(
      setDataValidation.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/ONE_OF_LIST requires a non-empty/);
    expect(calls).toHaveLength(0);
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
    const input = setDataValidation.inputSchema.parse({
      spreadsheet: "1AbC",
      worksheet: "Sheet1",
      range: "A2:A100",
      rule_type: "ONE_OF_LIST",
      list_values: ["A"],
    });
    const err = await setDataValidation
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
