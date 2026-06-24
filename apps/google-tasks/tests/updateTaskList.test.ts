import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateTaskListDefinition from "../scripts/updateTaskList.ts";

const { inputSchema } = updateTaskListDefinition;

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

describe("updateTaskList: inputSchema", () => {
  it("accepts a tasklist + title", () => {
    expect(
      inputSchema.safeParse({ tasklist: "L1", title: "Renamed" }).success,
    ).toBe(true);
  });

  it("rejects a missing required tasklist", () => {
    expect(inputSchema.safeParse({ title: "Renamed" }).success).toBe(false);
  });

  it("rejects an unknown key (schema is strict)", () => {
    expect(
      inputSchema.safeParse({ tasklist: "L1", title: "x", nope: true }).success,
    ).toBe(false);
  });
});

describe("updateTaskList: governance", () => {
  it("is a write that is non-destructive", () => {
    expect(updateTaskListDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateTaskListDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateTaskList: run", () => {
  it("PATCHes the single-list endpoint with the title and returns the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "L1", title: "Renamed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateTaskListDefinition.run(
      { tasklist: "L1", title: "Renamed" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists/L1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      title: "Renamed",
    });
    expect(result.title).toBe("Renamed");
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await updateTaskListDefinition
      .run({ tasklist: "L1", title: "Renamed" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
