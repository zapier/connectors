import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateAvatarLookDefinition from "../scripts/updateAvatarLook.ts";

const { inputSchema, outputSchema } = updateAvatarLookDefinition;

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

describe("updateAvatarLook: inputSchema", () => {
  it("accepts a look_id + name", () => {
    expect(
      inputSchema.safeParse({ look_id: "look_1", name: "Renamed" }).success,
    ).toBe(true);
  });

  it("requires look_id", () => {
    expect(inputSchema.safeParse({ name: "Renamed" }).success).toBe(false);
  });

  it("requires name", () => {
    expect(inputSchema.safeParse({ look_id: "look_1" }).success).toBe(false);
  });
});

describe("updateAvatarLook: governance", () => {
  it("is a non-read-only, non-destructive, idempotent write", () => {
    expect(updateAvatarLookDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateAvatarLookDefinition.annotations?.destructiveHint).toBe(false);
    expect(updateAvatarLookDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("updateAvatarLook: run", () => {
  it("PATCHes /v3/avatars/looks/{look_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "look_1",
          name: "Renamed",
          avatar_type: "studio_avatar",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateAvatarLookDefinition.run(
      { look_id: "look_1", name: "Renamed" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/avatars/looks/look_1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      name: "Renamed",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("look_1");
    expect(result.name).toBe("Renamed");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such look" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateAvatarLookDefinition
      .run({ look_id: "missing", name: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
