import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createTaskListDefinition from "../scripts/createTaskList.ts";

const { inputSchema } = createTaskListDefinition;

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

describe("createTaskList: inputSchema", () => {
  it("accepts a title", () => {
    expect(inputSchema.safeParse({ title: "Errands" }).success).toBe(true);
  });

  it("rejects a missing required title", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown key (schema is strict)", () => {
    expect(
      inputSchema.safeParse({ title: "Errands", nope: true }).success,
    ).toBe(false);
  });
});

describe("createTaskList: governance", () => {
  it("is a write that is non-destructive", () => {
    expect(createTaskListDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createTaskListDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createTaskList: run", () => {
  it("POSTs the title to the lists endpoint and returns the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "L9", title: "Errands" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createTaskListDefinition.run(
      { title: "Errands" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      title: "Errands",
    });
    expect(result.id).toBe("L9");
  });

  it("throws a ConnectorHttpError on a 403 insufficientPermissions", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createTaskListDefinition
      .run({ title: "Errands" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
