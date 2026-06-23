import { describe, expect, it } from "vitest";

import unsubscribeFromChannelDefinition from "../scripts/unsubscribeFromChannel.ts";

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

describe("unsubscribeFromChannel: happy path", () => {
  it("DELETEs subscriptions with the subscription id and returns success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const { data } = await unsubscribeFromChannelDefinition.run(
      { id: "SUB_abc123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/youtube/v3/subscriptions");
    expect(calls[0]?.url).toContain("id=SUB_abc123");
    expect(data).toEqual({ success: true });
    expect(
      unsubscribeFromChannelDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("unsubscribeFromChannel: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Access denied.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      unsubscribeFromChannelDefinition.run({ id: "x" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});

describe("unsubscribeFromChannel: governance", () => {
  it("is NOT destructive — unsubscribing is reversible via subscribeToChannel", () => {
    expect(unsubscribeFromChannelDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});
