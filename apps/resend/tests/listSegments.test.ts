import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listSegmentsDefinition from "../scripts/listSegments.ts";

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

describe("listSegments: run", () => {
  it("GETs /segments with default limit=20 and returns the parsed list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [{ id: "seg1", name: "VIP", created_at: "2026-07-09T00:00:00Z" }],
      });
    }) as typeof globalThis.fetch;

    const input = listSegmentsDefinition.inputSchema.parse({});
    const { data } = await listSegmentsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/segments?limit=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data[0]?.name).toBe("VIP");
    expect(listSegmentsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("passes an explicit limit and the after cursor through the query string", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "list", has_more: true, data: [] });
    }) as typeof globalThis.fetch;

    const input = listSegmentsDefinition.inputSchema.parse({
      limit: 50,
      after: "seg9",
    });
    await listSegmentsDefinition.run(input, { fetch: fakeFetch });

    const url = new URL(String(calls[0]?.url));
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("after")).toBe("seg9");
  });

  it("error path throws a ConnectorHttpError with the restricted-key hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "restricted_api_key",
          message: "This API key is restricted.",
          statusCode: 401,
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const input = listSegmentsDefinition.inputSchema.parse({});
    const err = await listSegmentsDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
