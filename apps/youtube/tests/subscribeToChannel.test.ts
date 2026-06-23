import { describe, expect, it } from "vitest";

import subscribeToChannelDefinition from "../scripts/subscribeToChannel.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...(init.headers ?? {}),
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

const validInput = {
  part: "snippet",
  snippet: {
    resourceId: {
      kind: "youtube#channel",
      channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    },
  },
};

describe("subscribeToChannel: happy path", () => {
  it("POSTs to /subscriptions and returns the created subscription", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "sub-123",
        snippet: {
          title: "Rick Astley",
          resourceId: {
            kind: "youtube#channel",
            channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await subscribeToChannelDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/youtube/v3/subscriptions");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data.id).toBe("sub-123");
    expect(data.alreadySatisfied).toBeUndefined();
    expect(
      subscribeToChannelDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("subscribeToChannel: soft success (already subscribed)", () => {
  it("catches subscriptionDuplicate, looks up the existing sub, and flags it", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    let n = 0;
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      n++;
      if (n === 1) {
        return jsonResponse(
          {
            error: {
              code: 400,
              message: "duplicate",
              errors: [{ reason: "subscriptionDuplicate" }],
            },
          },
          { status: 400 },
        );
      }
      return jsonResponse({
        items: [
          {
            id: "existing-sub-999",
            snippet: {
              title: "Rick Astley",
              resourceId: {
                kind: "youtube#channel",
                channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              },
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await subscribeToChannelDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]?.init?.method).toBe("GET");
    expect(calls[1]?.url).toContain("forChannelId=UCuAXFkgsw1L7xaCfnd5JJOw");
    expect(data.id).toBe("existing-sub-999");
    expect(data.alreadySatisfied).toBe(true);
    expect(data.alreadySatisfiedReason).toBe("subscriptionDuplicate");
    expect(
      subscribeToChannelDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("subscribeToChannel: error path", () => {
  it("rejects on a non-duplicate 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Access denied.",
            errors: [{ reason: "insufficientPermissions" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      subscribeToChannelDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
