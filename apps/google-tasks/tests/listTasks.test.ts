import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listTasksDefinition from "../scripts/listTasks.ts";

const { inputSchema } = listTasksDefinition;

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

describe("listTasks: inputSchema", () => {
  it("accepts a minimal tasklist", () => {
    expect(inputSchema.safeParse({ tasklist: "@default" }).success).toBe(true);
  });

  it("accepts completion + date filters", () => {
    expect(
      inputSchema.safeParse({
        tasklist: "L1",
        showCompleted: true,
        dueMin: "2026-01-01T00:00:00Z",
        maxResults: 50,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing required tasklist", () => {
    expect(inputSchema.safeParse({ showCompleted: true }).success).toBe(false);
  });

  it("rejects an unknown key (schema is strict)", () => {
    expect(inputSchema.safeParse({ tasklist: "L1", nope: true }).success).toBe(
      false,
    );
  });
});

describe("listTasks: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(listTasksDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listTasksDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listTasks: run", () => {
  it("GETs the tasks endpoint, defaults maxResults to 20, returns the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ items: [{ id: "T1", title: "Buy milk" }] });
    }) as typeof globalThis.fetch;

    const { data: result } = await listTasksDefinition.run(
      listTasksDefinition.inputSchema.parse({ tasklist: "L1" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const u = new URL(calls[0]!.url);
    expect(u.origin + u.pathname).toBe(
      "https://tasks.googleapis.com/tasks/v1/lists/L1/tasks",
    );
    expect(u.searchParams.get("maxResults")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.items).toHaveLength(1);
  });

  it("auto-pairs showHidden=true when showCompleted is set without showHidden", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ items: [] });
    }) as typeof globalThis.fetch;

    await listTasksDefinition.run(
      listTasksDefinition.inputSchema.parse({
        tasklist: "L1",
        showCompleted: true,
      }),
      { fetch: fakeFetch },
    );

    const u = new URL(calls[0]!.url);
    expect(u.searchParams.get("showCompleted")).toBe("true");
    expect(u.searchParams.get("showHidden")).toBe("true");
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listTasksDefinition
      .run(listTasksDefinition.inputSchema.parse({ tasklist: "L1" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
