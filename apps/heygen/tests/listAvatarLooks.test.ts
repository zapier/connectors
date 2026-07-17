import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listAvatarLooksDefinition from "../scripts/listAvatarLooks.ts";

const { inputSchema, outputSchema } = listAvatarLooksDefinition;

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

describe("listAvatarLooks: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({
        group_id: "grp_1",
        avatar_type: "digital_twin",
        ownership: "private",
        limit: 50,
        token: "cursor_1",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown avatar_type", () => {
    expect(inputSchema.safeParse({ avatar_type: "not_a_type" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown key (strict)", () => {
    expect(inputSchema.safeParse({ nope: true }).success).toBe(false);
  });
});

describe("listAvatarLooks: governance", () => {
  it("is a read-only, idempotent read", () => {
    expect(listAvatarLooksDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listAvatarLooksDefinition.annotations?.destructiveHint).toBe(false);
    expect(listAvatarLooksDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("listAvatarLooks: run", () => {
  it("GETs /v3/avatars/looks and maps {data} to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [
          { id: "look_1", name: "Look One", avatar_type: "studio_avatar" },
        ],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listAvatarLooksDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/avatars/looks?limit=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.id).toBe("look_1");
    expect(result.has_more).toBe(false);
  });

  it("forwards the filters as query params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ data: [], has_more: false, next_token: null });
    }) as typeof globalThis.fetch;

    await listAvatarLooksDefinition.run(
      {
        group_id: "grp_1",
        avatar_type: "photo_avatar",
        ownership: "public",
        limit: 5,
        token: "cursor_1",
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("group_id")).toBe("grp_1");
    expect(url.searchParams.get("avatar_type")).toBe("photo_avatar");
    expect(url.searchParams.get("ownership")).toBe("public");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("token")).toBe("cursor_1");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "bad token" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listAvatarLooksDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
