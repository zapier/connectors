import { afterEach, describe, expect, it } from "vitest";

import { connectionResolvers } from "../connections.ts";

// The direct (env) resolver is second in the chain; it reads the token from the
// named env var and builds a fetch that adds both the Bearer header and the
// `Prefer: IdType="ImmutableId"` token.
const directResolver = connectionResolvers["microsoft-outlook"][1];

describe("microsoft-outlook connection resolver", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.OUTLOOK_TEST_TOKEN;
  });

  it("sends Authorization: Bearer and Prefer: IdType=ImmutableId", async () => {
    process.env.OUTLOOK_TEST_TOKEN = "tok123";
    let captured: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      captured = init;
      return { ok: true } as unknown as Response;
    }) as typeof globalThis.fetch;

    const authedFetch = await directResolver.resolve("OUTLOOK_TEST_TOKEN");
    await authedFetch("https://graph.microsoft.com/v1.0/me");

    const headers = new Headers(captured?.headers);
    expect(headers.get("Authorization")).toBe("Bearer tok123");
    expect(headers.get("Prefer")).toBe('IdType="ImmutableId"');
  });

  it("appends ImmutableId to a Prefer header the caller already set", async () => {
    process.env.OUTLOOK_TEST_TOKEN = "tok123";
    let captured: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      captured = init;
      return { ok: true } as unknown as Response;
    }) as typeof globalThis.fetch;

    const authedFetch = await directResolver.resolve("OUTLOOK_TEST_TOKEN");
    await authedFetch("https://graph.microsoft.com/v1.0/me/messages/abc", {
      headers: { Prefer: 'outlook.body-content-type="text"' },
    });

    const prefer = new Headers(captured?.headers).get("Prefer");
    expect(prefer).toContain('outlook.body-content-type="text"');
    expect(prefer).toContain('IdType="ImmutableId"');
  });

  it("throws when the named env var is unset", () => {
    expect(() => directResolver.resolve("OUTLOOK_TEST_TOKEN_MISSING")).toThrow(
      /OUTLOOK_TEST_TOKEN_MISSING/,
    );
  });
});
