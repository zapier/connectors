import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/updateContact.ts";

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

// A valid instance of updateContact's outputSchema.
const cannedContact = {
  id: 4706510,
  title: "Owner",
  first_name: "Georgina",
  last_name: "Frank",
  email: "georgina@example.com",
  phone_office: null,
  phone_mobile: null,
  fax: null,
  client: { id: 5735776, name: "123 Industries" },
  created_at: "2017-06-26T21:20:07Z",
  updated_at: "2017-06-26T21:44:57Z",
};

describe("updateContact: inputSchema", () => {
  it("accepts an id-only input", () => {
    expect(inputSchema.safeParse({ id: 4706510 }).success).toBe(true);
  });

  it("accepts a partial update", () => {
    expect(
      inputSchema.safeParse({ id: 4706510, first_name: "Georgina" }).success,
    ).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({ first_name: "Georgina" }).success).toBe(
      false,
    );
  });
});

describe("updateContact: governance", () => {
  it("is not read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateContact: run", () => {
  it("PATCHes /v2/contacts/:id with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedContact);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 4706510, first_name: "Georgina", email: "georgina@example.com" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/contacts/4706510",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      first_name: "Georgina",
      email: "georgina@example.com",
    });
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("last_name");

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedContact);
    }) as typeof globalThis.fetch;

    await definition.run(
      { id: 4706510, first_name: "x" },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
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
