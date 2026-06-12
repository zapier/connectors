import { describe, expect, it } from "vitest";

import getCurrentAccountDefinition from "../scripts/getCurrentAccount.ts";

const { inputSchema, outputSchema } = getCurrentAccountDefinition;

function jsonResponse(
  body: unknown,
  init: {
    status?: number;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(
      init.headers ?? { "content-type": "application/json" },
    ),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("getCurrentAccount: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getCurrentAccount: run", () => {
  it("flattens the nested name/account_type/team/root_info shapes", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        account_id: "a1",
        email: "u@x.com",
        name: { display_name: "U X" },
        account_type: { ".tag": "pro" },
        team: { name: "Acme" },
        root_info: {
          root_namespace_id: "ns:root",
          home_namespace_id: "ns:home",
          home_path: "/H",
        },
      })) as typeof globalThis.fetch;

    const result = await getCurrentAccountDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(result.name).toBe("U X");
    expect(result.account_type).toBe("pro");
    expect(result.is_team).toBe(true);
    expect(result.team_name).toBe("Acme");
    expect(result.root_namespace_id).toBe("ns:root");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("reports is_team false and no team_name when there is no team", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        account_id: "a1",
        email: "u@x.com",
        name: { display_name: "U X" },
        account_type: { ".tag": "basic" },
        root_info: {
          root_namespace_id: "ns:root",
          home_namespace_id: "ns:home",
        },
      })) as typeof globalThis.fetch;

    const result = await getCurrentAccountDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(result.is_team).toBe(false);
    expect(result.team_name).toBeUndefined();
  });

  it("sends a literal null JSON body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        account_id: "a1",
        email: "u@x.com",
        name: { display_name: "U X" },
      });
    }) as typeof globalThis.fetch;

    await getCurrentAccountDefinition.run({}, { fetch: fakeFetch });

    expect(calls[0]?.init?.body).toBe("null");
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "invalid_grant/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      getCurrentAccountDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow(/Dropbox getCurrentAccount/);
  });
});
