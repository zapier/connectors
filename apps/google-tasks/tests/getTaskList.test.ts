import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getTaskListDefinition from "../scripts/getTaskList.ts";

const { inputSchema } = getTaskListDefinition;

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

describe("getTaskList: inputSchema", () => {
  it("accepts a tasklist id", () => {
    expect(inputSchema.safeParse({ tasklist: "@default" }).success).toBe(true);
  });

  it("rejects a missing required tasklist", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown key (schema is strict)", () => {
    expect(inputSchema.safeParse({ tasklist: "L1", nope: true }).success).toBe(
      false,
    );
  });
});

describe("getTaskList: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(getTaskListDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getTaskListDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getTaskList: run", () => {
  it("GETs the single-list endpoint and returns the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "L1", title: "Inbox" });
    }) as typeof globalThis.fetch;

    const { data: result } = await getTaskListDefinition.run(
      { tasklist: "L1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists/L1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.id).toBe("L1");
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getTaskListDefinition
      .run({ tasklist: "L1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
