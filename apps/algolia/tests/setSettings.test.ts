import { describe, expect, it } from "vitest";

import setSettingsDefinition from "../scripts/setSettings.ts";

const { inputSchema, outputSchema } = setSettingsDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
    json: async () => body,
  } as unknown as Response;
}

const okBody = { taskID: 99, updatedAt: "2026-01-01T00:00:00.000Z" };

describe("setSettings: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        settings: { searchableAttributes: ["name"] },
      }).success,
    ).toBe(true);
  });

  it("requires settings", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", settings: {}, nope: 1 }).success,
    ).toBe(false);
  });
});

describe("setSettings: governance", () => {
  it("is a non-destructive write", () => {
    expect(setSettingsDefinition.annotations?.readOnlyHint).toBe(false);
    expect(setSettingsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("setSettings: run", () => {
  it("PUTs the settings object as the raw body and forwardToReplicas as a query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const settings = {
      searchableAttributes: ["name", "description"],
      customRanking: ["desc(popularity)"],
    };

    const { data } = await setSettingsDefinition.run(
      { indexName: "products", settings, forwardToReplicas: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/settings?forwardToReplicas=true",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    // The settings object is unwrapped and sent as the raw body itself.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(settings);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(99);
  });

  it("omits the forwardToReplicas query param when not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await setSettingsDefinition.run(
      { indexName: "products", settings: { hitsPerPage: 10 } },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/settings",
    );
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await setSettingsDefinition
      .run({ indexName: "p", settings: {} }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
