import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createContact.ts";

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

// A valid instance of createContact's outputSchema.
const cannedContact = {
  id: 4706510,
  title: "Owner",
  first_name: "George",
  last_name: "Frank",
  email: "george@example.com",
  phone_office: "555-1234",
  phone_mobile: "555-5678",
  fax: null,
  client: { id: 5735776, name: "123 Industries" },
  created_at: "2017-06-26T21:20:07Z",
  updated_at: "2017-06-26T21:27:07Z",
};

describe("createContact: inputSchema", () => {
  it("accepts a minimal valid input (client_id + first_name)", () => {
    expect(
      inputSchema.safeParse({ client_id: 5735776, first_name: "George" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing client_id", () => {
    expect(inputSchema.safeParse({ first_name: "George" }).success).toBe(false);
  });

  it("rejects a missing first_name", () => {
    expect(inputSchema.safeParse({ client_id: 5735776 }).success).toBe(false);
  });
});

describe("createContact: run", () => {
  it("POSTs to /v2/contacts with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedContact);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { client_id: 5735776, first_name: "George", email: "george@example.com" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/contacts");
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      client_id: 5735776,
      first_name: "George",
      email: "george@example.com",
    });
    expect(body).not.toHaveProperty("last_name");
    expect(body).not.toHaveProperty("phone_office");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(4706510);
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
      { client_id: 5735776, first_name: "George" },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on 422", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Client can't be blank" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ client_id: 5735776, first_name: "George" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
