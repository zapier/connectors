import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getCurrentUserDefinition from "../scripts/getCurrentUser.ts";

const { inputSchema, outputSchema } = getCurrentUserDefinition;

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

// The root endpoint nests identity under `auth`; the tool flattens it.
const WIRE = {
  status: "ok",
  auth: { email: "ada@example.com", actor: { userId: "u_1" } },
};

describe("getCurrentUser: inputSchema", () => {
  it("takes no input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ userId: "u_1" }).success).toBe(false);
  });
});

describe("getCurrentUser: governance", () => {
  it("is read-only", () => {
    expect(getCurrentUserDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getCurrentUser: run", () => {
  it("GETs the API root and flattens auth to { userId, email }", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(WIRE);
    }) as typeof globalThis.fetch;

    const { data: result } = await getCurrentUserDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/");
    expect(result).toEqual({ userId: "u_1", email: "ada@example.com" });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK (bad key)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getCurrentUserDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
