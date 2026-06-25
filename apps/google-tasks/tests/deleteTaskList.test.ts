import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteTaskListDefinition from "../scripts/deleteTaskList.ts";

const { inputSchema } = deleteTaskListDefinition;

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

describe("deleteTaskList: inputSchema", () => {
  it("accepts a tasklist id", () => {
    expect(inputSchema.safeParse({ tasklist: "L1" }).success).toBe(true);
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

describe("deleteTaskList: governance", () => {
  it("is a destructive write", () => {
    expect(deleteTaskListDefinition.annotations?.readOnlyHint).toBe(false);
    expect(deleteTaskListDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteTaskList: run", () => {
  it("DELETEs the single-list endpoint and returns { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("", { status: 204 });
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteTaskListDefinition.run(
      { tasklist: "L1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists/L1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(result).toEqual({ success: true });
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await deleteTaskListDefinition
      .run({ tasklist: "L1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
