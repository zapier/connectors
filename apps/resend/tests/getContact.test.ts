import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getContactDefinition from "../scripts/getContact.ts";

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

describe("getContact: run", () => {
  it("GETs /contacts/{id} and returns the parsed contact", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "contact",
        id: "c1",
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        created_at: "2026-07-09T00:00:00Z",
        unsubscribed: false,
        properties: { plan: "pro" },
      });
    }) as typeof globalThis.fetch;

    const input = getContactDefinition.inputSchema.parse({ id: "c1" });
    const { data } = await getContactDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts/c1");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.email).toBe("ada@example.com");
    expect(getContactDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("URL-encodes an email supplied as the id into the path (id-or-email)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "contact",
        id: "c1",
        email: "ada@example.com",
      });
    }) as typeof globalThis.fetch;

    const input = getContactDefinition.inputSchema.parse({
      id: "ada@example.com",
    });
    await getContactDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://api.resend.com/contacts/ada%40example.com",
    );
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Contact not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = getContactDefinition.inputSchema.parse({ id: "missing" });
    const err = await getContactDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
