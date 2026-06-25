import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteTaskDefinition from "../scripts/deleteTask.ts";

const { inputSchema, outputSchema } = deleteTaskDefinition;

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

describe("deleteTask: inputSchema", () => {
  it("accepts a tasklist + task", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", task: "task-1" }).success,
    ).toBe(true);
  });

  it("rejects an unknown key (strict)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", task: "task-1", bogus: 1 })
        .success,
    ).toBe(false);
  });

  it("requires tasklist", () => {
    expect(inputSchema.safeParse({ task: "task-1" }).success).toBe(false);
  });
});

describe("deleteTask: governance", () => {
  it("is flagged destructive", () => {
    expect(deleteTaskDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteTask: run", () => {
  it("DELETEs the task endpoint and returns { success: true } from an empty body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return emptyResponse();
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteTaskDefinition.run(
      { tasklist: "list-1", task: "task-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(result).toEqual({ success: true });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await deleteTaskDefinition
      .run({ tasklist: "list-1", task: "task-1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
