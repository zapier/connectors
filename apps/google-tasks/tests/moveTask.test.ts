import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import moveTaskDefinition from "../scripts/moveTask.ts";

const { inputSchema, outputSchema } = moveTaskDefinition;

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

describe("moveTask: inputSchema", () => {
  it("accepts a minimal move (tasklist + task)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "@default", task: "task-1" }).success,
    ).toBe(true);
  });

  it("accepts a reparent + reorder + cross-list move", () => {
    expect(
      inputSchema.safeParse({
        tasklist: "list-1",
        task: "task-1",
        parent: "parent-1",
        previous: "sibling-1",
        destinationTasklist: "list-2",
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

describe("moveTask: governance", () => {
  it("is not read-only (it writes)", () => {
    expect(moveTaskDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("moveTask: run", () => {
  it("POSTs to the move endpoint with parent/previous/destinationTasklist on the query string and returns the parsed task", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task-1", title: "Buy milk" });
    }) as typeof globalThis.fetch;

    const { data: result } = await moveTaskDefinition.run(
      {
        tasklist: "list-1",
        task: "task-1",
        parent: "parent-1",
        previous: "sibling-1",
        destinationTasklist: "list-2",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/list-1/tasks/task-1/move",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(url.searchParams.get("parent")).toBe("parent-1");
    expect(url.searchParams.get("previous")).toBe("sibling-1");
    expect(url.searchParams.get("destinationTasklist")).toBe("list-2");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("task-1");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await moveTaskDefinition
      .run({ tasklist: "list-1", task: "task-1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
