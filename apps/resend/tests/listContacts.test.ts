import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listContactsDefinition from "../scripts/listContacts.ts";

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

describe("listContacts: run", () => {
  it("GETs /contacts and returns the parsed list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "c1",
            email: "a@example.com",
            first_name: "A",
            last_name: null,
            created_at: "2026-07-09T00:00:00Z",
            unsubscribed: false,
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = listContactsDefinition.inputSchema.parse({});
    const { data } = await listContactsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]?.url));
    expect(url.origin + url.pathname).toBe("https://api.resend.com/contacts");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data[0]?.id).toBe("c1");
    expect(listContactsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("fills the default limit of 20 into the query string when omitted", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "list", has_more: false, data: [] });
    }) as typeof globalThis.fetch;

    const input = listContactsDefinition.inputSchema.parse({});
    await listContactsDefinition.run(input, { fetch: fakeFetch });

    const url = new URL(String(calls[0]?.url));
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("error path throws a ConnectorHttpError with the restricted-key hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "restricted_api_key",
          message: "This API key is restricted to sending emails.",
          statusCode: 401,
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const input = listContactsDefinition.inputSchema.parse({});
    const err = await listContactsDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
