import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getUserSubscriptionDefinition from "../scripts/getUserSubscription.ts";

const { outputSchema } = getUserSubscriptionDefinition;

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

const subscription = {
  tier: "creator",
  character_count: 12345,
  character_limit: 100000,
  next_character_count_reset_unix: 1704067200,
  status: "active",
  billing_period: "monthly_period",
  voice_slots_used: 3,
  voice_limit: 30,
  can_use_instant_voice_cloning: true,
  can_use_professional_voice_cloning: false,
};

describe("getUserSubscription: run", () => {
  it("GETs /v1/user/subscription and returns the schema-valid subscription", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(subscription);
    }) as typeof globalThis.fetch;

    const { data } = await getUserSubscriptionDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/user/subscription",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.tier).toBe("creator");
    expect(data.character_count).toBe(12345);
    expect(data.character_limit).toBe(100000);
  });

  it("accepts a minimal free-tier payload (nullable fields omitted)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        tier: "free",
        character_count: 0,
        character_limit: 10000,
        status: "free",
      })) as typeof globalThis.fetch;

    const { data } = await getUserSubscriptionDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.tier).toBe("free");
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getUserSubscriptionDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });

  it("surfaces the restricted-key hint on insufficient_permissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: {
            type: "authorization_error",
            code: "insufficient_permissions",
            message:
              "The API key you used is missing the permission user_read to execute this operation.",
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getUserSubscriptionDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.message).toContain("insufficient_permissions");
    expect(httpErr.message).toContain("endpoint scopes");
  });

  // Exact wire payload observed live (2026-07-10): a permission-restricted key
  // 401s with the generic code "unauthorized" — the specific code rides only on
  // the legacy status field, so the hint lookup must fall back to it.
  it("surfaces the restricted-key hint on the live 401 payload (status: missing_permissions)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: {
            type: "authentication_error",
            code: "unauthorized",
            message:
              "The API key you used is missing the permission user_read to execute this operation.",
            status: "missing_permissions",
          },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getUserSubscriptionDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.message).toContain("missing_permissions");
    expect(httpErr.message).toContain("grant it on the key");
  });
});
