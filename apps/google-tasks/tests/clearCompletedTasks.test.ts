import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import clearCompletedTasksDefinition from "../scripts/clearCompletedTasks.ts";

const { inputSchema, outputSchema } = clearCompletedTasksDefinition;

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

/** Delete/clear endpoints return an empty body — mirror that exactly. */
function emptyResponse(init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("no body");
    },
  } as unknown as Response;
}

describe("clearCompletedTasks: inputSchema", () => {
  it("accepts a tasklist", () => {
    expect(inputSchema.safeParse({ tasklist: "@default" }).success).toBe(true);
  });

  it("rejects an unknown key (strict)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", bogus: 1 }).success,
    ).toBe(false);
  });

  it("requires tasklist", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("clearCompletedTasks: governance", () => {
  it("is not flagged destructive (hidden tasks remain retrievable)", () => {
    expect(clearCompletedTasksDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("clearCompletedTasks: run", () => {
  it("POSTs to the list's clear endpoint and returns { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return emptyResponse();
    }) as typeof globalThis.fetch;

    const { data: result } = await clearCompletedTasksDefinition.run(
      { tasklist: "list-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/clear",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(result).toEqual({ success: true });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await clearCompletedTasksDefinition
      .run({ tasklist: "list-1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
