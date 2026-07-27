import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listDomainsDefinition from "../scripts/listDomains.ts";

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

describe("listDomains: run", () => {
  it("GETs /domains and returns the parsed list", async () => {
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
            id: "d_1",
            name: "acme.com",
            status: "verified",
            created_at: "2026-07-01T00:00:00Z",
            region: "us-east-1",
          },
        ],
      });
    }) as typeof globalThis.fetch;

    // listDomains takes NO input.
    const input = listDomainsDefinition.inputSchema.parse({});
    const { data } = await listDomainsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/domains");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(data.object).toBe("list");
    expect(data.data[0]?.name).toBe("acme.com");
    expect(data.data[0]?.status).toBe("verified");
    expect(listDomainsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
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

    const input = listDomainsDefinition.inputSchema.parse({});
    const err = await listDomainsDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
