import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createTaskDefinition from "../scripts/createTask.ts";

const { inputSchema, outputSchema } = createTaskDefinition;

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

describe("createTask: inputSchema", () => {
  it("accepts a minimal task (just a tasklist)", () => {
    expect(inputSchema.safeParse({ tasklist: "@default" }).success).toBe(true);
  });

  it("accepts a fully specified task", () => {
    expect(
      inputSchema.safeParse({
        tasklist: "list-1",
        title: "Buy milk",
        notes: "2%",
        status: "needsAction",
        due: "2026-01-01T00:00:00Z",
        parent: "parent-1",
        previous: "sibling-1",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown key (strict)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", bogus: "x" }).success,
    ).toBe(false);
  });

  it("requires tasklist", () => {
    expect(inputSchema.safeParse({ title: "Buy milk" }).success).toBe(false);
  });
});

describe("createTask: governance", () => {
  it("is not read-only (it writes)", () => {
    expect(createTaskDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createTask: run", () => {
  it("POSTs to the list's tasks endpoint with title/notes/status/due in the body and returns the parsed task", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "task-1",
        title: "Buy milk",
        status: "needsAction",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createTaskDefinition.run(
      {
        tasklist: "list-1",
        title: "Buy milk",
        notes: "2%",
        status: "needsAction",
        due: "2026-01-01T00:00:00Z",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      title: "Buy milk",
      notes: "2%",
      status: "needsAction",
      due: "2026-01-01T00:00:00Z",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("task-1");
  });

  it("puts parent and previous on the query string, not the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task-1", title: "Buy milk" });
    }) as typeof globalThis.fetch;

    await createTaskDefinition.run(
      {
        tasklist: "list-1",
        title: "Buy milk",
        parent: "parent-1",
        previous: "sibling-1",
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("parent")).toBe("parent-1");
    expect(url.searchParams.get("previous")).toBe("sibling-1");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).not.toHaveProperty("parent");
    expect(body).not.toHaveProperty("previous");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createTaskDefinition
      .run({ tasklist: "list-1", title: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
