import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateTaskDefinition from "../scripts/updateTask.ts";

const { inputSchema, outputSchema } = updateTaskDefinition;

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

describe("updateTask: inputSchema", () => {
  it("accepts a minimal update (tasklist + task)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", task: "task-1" }).success,
    ).toBe(true);
  });

  it("accepts marking a task completed", () => {
    expect(
      inputSchema.safeParse({
        tasklist: "list-1",
        task: "task-1",
        status: "completed",
      }).success,
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

describe("updateTask: governance", () => {
  it("is not read-only (it writes)", () => {
    expect(updateTaskDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateTask: run", () => {
  it("PATCHes the task endpoint (not PUT) and returns the parsed task", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "task-1",
        title: "Buy milk",
        status: "completed",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateTaskDefinition.run(
      { tasklist: "list-1", task: "task-1", status: "completed" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      status: "completed",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("task-1");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await updateTaskDefinition
      .run(
        { tasklist: "list-1", task: "task-1", title: "x" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
