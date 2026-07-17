import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listAvatarGroupsDefinition from "../scripts/listAvatarGroups.ts";

const { inputSchema, outputSchema } = listAvatarGroupsDefinition;

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

describe("listAvatarGroups: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({
        ownership: "private",
        limit: 25,
        token: "cursor_1",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown ownership value", () => {
    expect(inputSchema.safeParse({ ownership: "shared" }).success).toBe(false);
  });

  it("rejects an unknown key (strict)", () => {
    expect(inputSchema.safeParse({ nope: true }).success).toBe(false);
  });
});

describe("listAvatarGroups: governance", () => {
  it("is a read-only, idempotent read", () => {
    expect(listAvatarGroupsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listAvatarGroupsDefinition.annotations?.destructiveHint).toBe(false);
    expect(listAvatarGroupsDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("listAvatarGroups: run", () => {
  it("GETs /v3/avatars and maps {data} to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [
          {
            id: "grp_1",
            name: "Group One",
            created_at: 1700000000,
            looks_count: 3,
          },
        ],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listAvatarGroupsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/avatars?limit=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.id).toBe("grp_1");
    expect(result.has_more).toBe(false);
  });

  it("forwards the filters as query params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ data: [], has_more: false, next_token: null });
    }) as typeof globalThis.fetch;

    await listAvatarGroupsDefinition.run(
      { ownership: "private", limit: 5, token: "cursor_1" },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("ownership")).toBe("private");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("token")).toBe("cursor_1");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "rate_limited", message: "slow down" } },
        { status: 429 },
      )) as typeof globalThis.fetch;

    const err = await listAvatarGroupsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(429);
  });
});
