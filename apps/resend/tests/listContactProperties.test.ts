import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listContactPropertiesDefinition from "../scripts/listContactProperties.ts";

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

describe("listContactProperties: run", () => {
  it("GETs /contact-properties and returns the parsed list", async () => {
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
            id: "p1",
            key: "plan",
            type: "string",
            fallback_value: null,
            created_at: "2026-07-09T00:00:00Z",
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = listContactPropertiesDefinition.inputSchema.parse({});
    const { data } = await listContactPropertiesDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]?.url));
    expect(url.origin + url.pathname).toBe(
      "https://api.resend.com/contact-properties",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data[0]?.key).toBe("plan");
    expect(
      listContactPropertiesDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
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

    const input = listContactPropertiesDefinition.inputSchema.parse({});
    await listContactPropertiesDefinition.run(input, { fetch: fakeFetch });

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

    const input = listContactPropertiesDefinition.inputSchema.parse({});
    const err = await listContactPropertiesDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
