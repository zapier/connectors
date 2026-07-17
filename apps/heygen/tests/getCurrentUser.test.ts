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

describe("getCurrentUser: inputSchema", () => {
  it("accepts an empty input (takes no arguments)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects unexpected fields (strict)", () => {
    expect(inputSchema.safeParse({ user_id: "x" }).success).toBe(false);
  });
});

describe("getCurrentUser: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(getCurrentUserDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getCurrentUserDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getCurrentUser: outputSchema", () => {
  // Regression: the credit/balance leaves were typed as objects (z.record),
  // so a scalar balance failed validation and was stripped — defeating the
  // tool's purpose of reporting the balance before a generate call.
  it("keeps a numeric wallet balance and string currency", () => {
    const parsed = outputSchema.safeParse({
      username: "acme",
      billing_type: "wallet",
      wallet: { remaining_balance: 12.5, currency: "USD" },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.wallet?.remaining_balance).toBe(12.5);
    expect(parsed.data?.wallet?.currency).toBe("USD");
  });

  it("keeps the wallet auto_reload settings (observed in the live smoke test)", () => {
    const parsed = outputSchema.safeParse({
      username: "acme",
      billing_type: "wallet",
      wallet: {
        remaining_balance: 0,
        currency: "usd",
        auto_reload: { enabled: false },
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.wallet?.auto_reload?.enabled).toBe(false);
  });

  // Regression: on a subscription account (surfaced via the Zapier/OAuth
  // connection — that auth path bills the web plan, so billing_type flips to
  // "subscription"), credits is a nested object of credit-count buckets, not a
  // scalar. The codegen-guessed `number` type failed output validation live.
  it("keeps subscription credit buckets (surfaced via the Zapier/OAuth arm)", () => {
    const parsed = outputSchema.safeParse({
      username: "acme",
      billing_type: "subscription",
      subscription: {
        plan: "free",
        credits: { add_on_credits: {}, premium_credits: {} },
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.subscription?.credits?.add_on_credits).toEqual({});
  });

  it("preserves populated subscription credit counts", () => {
    const parsed = outputSchema.safeParse({
      username: "acme",
      billing_type: "subscription",
      subscription: {
        plan: "pro",
        credits: { add_on_credits: { monthly: 300 }, premium_credits: {} },
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.subscription?.credits?.add_on_credits?.monthly).toBe(
      300,
    );
  });

  it("keeps numeric usage_based credit fields", () => {
    const parsed = outputSchema.safeParse({
      username: "acme",
      billing_type: "usage_based",
      usage_based: {
        included_credits: 100,
        remaining_credits: 42,
        spending_current_usd: 3.5,
        spending_cap_usd: 50,
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.usage_based?.remaining_credits).toBe(42);
  });
});

describe("getCurrentUser: run", () => {
  it("GETs /v3/users/me and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          username: "acme",
          email: "hello@acme.com", // pii:allow — fake fixture email, not real PII
          billing_type: "wallet",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getCurrentUserDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/users/me");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.username).toBe("acme");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "bad key" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getCurrentUserDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
