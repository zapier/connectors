import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listContactSegmentsDefinition from "../scripts/listContactSegments.ts";

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

describe("listContactSegments: run", () => {
  it("GETs /contacts/{contact_id}/segments and returns the parsed list", async () => {
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

    const input = listContactSegmentsDefinition.inputSchema.parse({
      contact_id: "c1",
    });
    const { data } = await listContactSegmentsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts/c1/segments");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data[0]?.name).toBe("VIP");
    expect(
      listContactSegmentsDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });

  it("builds the path with the encoded contact_id (email)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "list", has_more: false, data: [] });
    }) as typeof globalThis.fetch;

    const input = listContactSegmentsDefinition.inputSchema.parse({
      contact_id: "ada@example.com",
    });
    await listContactSegmentsDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://api.resend.com/contacts/ada%40example.com/segments",
    );
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

    const input = listContactSegmentsDefinition.inputSchema.parse({
      contact_id: "c1",
    });
    const err = await listContactSegmentsDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
