import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listUsersDefinition from "../scripts/listUsers.ts";

const { inputSchema, outputSchema } = listUsersDefinition;

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

const LIST = {
  object: "list",
  results: [
    {
      object: "user",
      id: "u1111111-2222-3333-4444-555566667777",
      type: "person",
      name: "Ada Lovelace",
    },
  ],
  has_more: false,
  next_cursor: null,
};

describe("listUsers: inputSchema", () => {
  it("accepts an empty input (no required fields)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional page_size + start_cursor", () => {
    expect(
      inputSchema.safeParse({ page_size: 50, start_cursor: "cursor-1" })
        .success,
    ).toBe(true);
  });
});

describe("listUsers: governance", () => {
  it("is read-only", () => {
    expect(listUsersDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listUsers: run", () => {
  it("GETs /v1/users, applies the default page_size, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await listUsersDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe("https://api.notion.com/v1/users");
    expect(calls[0]?.init?.method).toBe("GET");
    // page_size defaults to 20 when omitted (query default-limit).
    expect(url.searchParams.get("page_size")).toBe("20");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
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

    const err = await listUsersDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
