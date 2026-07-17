import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getAvatarLookDefinition from "../scripts/getAvatarLook.ts";

const { inputSchema, outputSchema } = getAvatarLookDefinition;

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

describe("getAvatarLook: inputSchema", () => {
  it("accepts a look_id", () => {
    expect(inputSchema.safeParse({ look_id: "look_1" }).success).toBe(true);
  });

  it("requires look_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getAvatarLook: governance", () => {
  it("is a read-only, idempotent read", () => {
    expect(getAvatarLookDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getAvatarLookDefinition.annotations?.destructiveHint).toBe(false);
    expect(getAvatarLookDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("getAvatarLook: run", () => {
  it("GETs /v3/avatars/looks/{look_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "look_1",
          name: "Look One",
          avatar_type: "digital_twin",
          status: "completed",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getAvatarLookDefinition.run(
      { look_id: "look_1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/avatars/looks/look_1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("look_1");
    expect(result.avatar_type).toBe("digital_twin");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such look" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getAvatarLookDefinition
      .run({ look_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
