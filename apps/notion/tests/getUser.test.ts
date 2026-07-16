import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getUserDefinition from "../skills/notion/scripts/getUser.ts";

const { inputSchema, outputSchema } = getUserDefinition;

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

const USER = {
  object: "user",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  type: "person",
  name: "X",
};

describe("getUser: inputSchema", () => {
  it("requires user_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ user_id: "abc" }).success).toBe(true);
  });
});

describe("getUser: governance", () => {
  it("is read-only", () => {
    expect(getUserDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getUser: run", () => {
  it("GETs /v1/users/{id} and returns the parsed user", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(USER);
    }) as typeof globalThis.fetch;

    const { data: result } = await getUserDefinition.run(
      { user_id: "1429989f-e8ac-4eff-bc8f-57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/users/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.name).toBe("X");
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(USER);
    }) as typeof globalThis.fetch;

    await getUserDefinition.run(
      { user_id: "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/users/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError on 404 (not found)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find user",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getUserDefinition
      .run({ user_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
