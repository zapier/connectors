import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/deleteTimeEntry.ts";

const { inputSchema, outputSchema } = definition;

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

describe("deleteTimeEntry: inputSchema", () => {
  it("accepts an id", () => {
    expect(inputSchema.safeParse({ id: 636709355 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: 1.5 }).success).toBe(false);
  });
});

describe("deleteTimeEntry: governance", () => {
  it("is destructive", () => {
    expect(definition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteTimeEntry: run", () => {
  it("DELETEs /v2/time_entries/{id} and synthesizes { id, deleted: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    // Harvest returns an empty 200 on delete.
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("", { status: 200 });
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 636709355 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/time_entries/636709355",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    // Result is synthesized, not read from res.json().
    expect(result).toEqual({ id: 636709355, deleted: true });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("does not rely on the response body (empty {} 200 still works)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({}, { status: 200 })) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 42 },
      { fetch: fakeFetch },
    );

    expect(result).toEqual({ id: 42, deleted: true });
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse("", { status: 200 });
    }) as typeof globalThis.fetch;

    await definition.run({ id: 636709355 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on non-2xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Can't delete a locked time entry" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 636709355 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
