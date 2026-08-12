import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/deleteContact.ts";

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

describe("deleteContact: inputSchema", () => {
  it("accepts a valid id", () => {
    expect(inputSchema.safeParse({ id: 4706510 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("deleteContact: governance", () => {
  it("is destructive", () => {
    expect(definition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteContact: run", () => {
  it("DELETEs /v2/contacts/:id and synthesizes { id, deleted: true } from an empty 200", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    // Harvest returns an empty 200 on delete. Fail loudly if run() relies on
    // res.json() by making it throw — the script must not call it.
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        text: async () => "",
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      } as unknown as Response;
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 4706510 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/contacts/4706510",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");

    // result deep-equals the synthesized shape, echoing the input id.
    expect(result).toEqual({ id: 4706510, deleted: true });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    await definition.run({ id: 4706510 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 999 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
