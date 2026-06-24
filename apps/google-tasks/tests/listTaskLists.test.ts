import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listTaskListsDefinition from "../scripts/listTaskLists.ts";

const { inputSchema } = listTaskListsDefinition;

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

describe("listTaskLists: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts maxResults + pageToken", () => {
    expect(
      inputSchema.safeParse({ maxResults: 50, pageToken: "abc" }).success,
    ).toBe(true);
  });

  it("rejects an unknown key (schema is strict)", () => {
    expect(inputSchema.safeParse({ nope: true }).success).toBe(false);
  });
});

describe("listTaskLists: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(listTaskListsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listTaskListsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listTaskLists: run", () => {
  it("GETs the lists endpoint, defaults maxResults to 20, returns the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ items: [{ id: "L1", title: "Inbox" }] });
    }) as typeof globalThis.fetch;

    const { data: result } = await listTaskListsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const u = new URL(calls[0]!.url);
    expect(u.origin + u.pathname).toBe(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    );
    expect(u.searchParams.get("maxResults")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.items).toHaveLength(1);
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listTaskListsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
