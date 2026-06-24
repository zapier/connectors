import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findTaskDefinition from "../scripts/findTask.ts";

const { inputSchema, outputSchema } = findTaskDefinition;

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

const PAGE = {
  items: [
    { id: "1", title: "Buy milk" },
    { id: "2", title: "Buy eggs" },
  ],
};

describe("findTask: inputSchema", () => {
  it("accepts a tasklist + title", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", title: "Buy milk" })
        .success,
    ).toBe(true);
  });

  it("accepts showCompleted", () => {
    expect(
      inputSchema.safeParse({
        tasklist: "list-1",
        title: "Buy milk",
        showCompleted: true,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown key (strict)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", title: "x", bogus: 1 })
        .success,
    ).toBe(false);
  });

  it("requires tasklist", () => {
    expect(inputSchema.safeParse({ title: "Buy milk" }).success).toBe(false);
  });
});

describe("findTask: governance", () => {
  it("is read-only", () => {
    expect(findTaskDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("findTask: run", () => {
  it("returns an exact, case-insensitive match", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(PAGE)) as typeof globalThis.fetch;

    const { data: result } = await findTaskDefinition.run(
      { tasklist: "list-1", title: "buy milk", showCompleted: false },
      { fetch: fakeFetch },
    );

    expect(result).toEqual({
      found: true,
      matchType: "exact",
      task: { id: "1", title: "Buy milk" },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("falls back to a substring match when no exact match exists", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(PAGE)) as typeof globalThis.fetch;

    const { data: result } = await findTaskDefinition.run(
      { tasklist: "list-1", title: "milk", showCompleted: false },
      { fetch: fakeFetch },
    );

    expect(result.found).toBe(true);
    expect(result.matchType).toBe("substring");
    expect(result.task).toMatchObject({ id: "1", title: "Buy milk" });
  });

  it("returns no match when nothing matches", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(PAGE)) as typeof globalThis.fetch;

    const { data: result } = await findTaskDefinition.run(
      { tasklist: "list-1", title: "wash car", showCompleted: false },
      { fetch: fakeFetch },
    );

    expect(result).toEqual({ found: false, matchType: "none", task: null });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("pages through nextPageToken, passing pageToken on the next request", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      // First page: no match, hand back a continuation token.
      if (!new URL(url).searchParams.get("pageToken")) {
        return jsonResponse({
          items: [{ id: "9", title: "Buy eggs" }],
          nextPageToken: "p2",
        });
      }
      // Second page: the match.
      return jsonResponse({ items: [{ id: "1", title: "Buy milk" }] });
    }) as typeof globalThis.fetch;

    const { data: result } = await findTaskDefinition.run(
      { tasklist: "list-1", title: "buy milk", showCompleted: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(new URL(calls[1]?.url as string).searchParams.get("pageToken")).toBe(
      "p2",
    );
    expect(result).toEqual({
      found: true,
      matchType: "exact",
      task: { id: "1", title: "Buy milk" },
    });
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await findTaskDefinition
      .run(
        { tasklist: "list-1", title: "x", showCompleted: false },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
