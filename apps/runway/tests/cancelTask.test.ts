import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import cancelTaskDefinition from "../scripts/cancelTask.ts";

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

describe("cancelTask: run", () => {
  it("DELETEs /tasks/{id} with no body and synthesizes the confirmation", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(undefined, { status: 204 });
    }) as typeof globalThis.fetch;

    const input = cancelTaskDefinition.inputSchema.parse({ id: "t1" });
    const { data } = await cancelTaskDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.dev.runwayml.com/v1/tasks/t1");
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect((calls[0]?.init?.headers as Headers).get("X-Runway-Version")).toBe(
      "2024-11-06",
    );
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(data).toEqual({ id: "t1", cancelled: true });
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad_request" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = cancelTaskDefinition.inputSchema.parse({ id: "t1" });
    const err = await cancelTaskDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
