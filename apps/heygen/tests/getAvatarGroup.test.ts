import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getAvatarGroupDefinition from "../scripts/getAvatarGroup.ts";

const { inputSchema, outputSchema } = getAvatarGroupDefinition;

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

describe("getAvatarGroup: inputSchema", () => {
  it("accepts a group_id", () => {
    expect(inputSchema.safeParse({ group_id: "grp_1" }).success).toBe(true);
  });

  it("requires group_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getAvatarGroup: governance", () => {
  it("is a read-only, idempotent read", () => {
    expect(getAvatarGroupDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getAvatarGroupDefinition.annotations?.destructiveHint).toBe(false);
    expect(getAvatarGroupDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("getAvatarGroup: run", () => {
  it("GETs /v3/avatars/{group_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "grp_1",
          name: "Group One",
          created_at: 1700000000,
          looks_count: 2,
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getAvatarGroupDefinition.run(
      { group_id: "grp_1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/avatars/grp_1");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("grp_1");
    expect(result.looks_count).toBe(2);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such group" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getAvatarGroupDefinition
      .run({ group_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
