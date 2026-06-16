import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getBotUserDefinition from "../scripts/getBotUser.ts";

const { inputSchema, outputSchema } = getBotUserDefinition;

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

const BOT = {
  object: "user",
  id: "bot11111-2222-3333-4444-555566667777",
  type: "bot",
  name: "My Integration",
  bot: { owner: { type: "workspace" }, workspace_name: "Acme" },
};

describe("getBotUser: inputSchema", () => {
  it("accepts an empty input (no fields)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getBotUser: governance", () => {
  it("is read-only", () => {
    expect(getBotUserDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getBotUser: run", () => {
  it("GETs /v1/users/me and returns the parsed bot user", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(BOT);
    }) as typeof globalThis.fetch;

    const { data: result } = await getBotUserDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/users/me");
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.type).toBe("bot");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "unauthorized",
          message: "API token is invalid",
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getBotUserDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
