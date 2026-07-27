import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listSegmentContactsDefinition from "../scripts/listSegmentContacts.ts";

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

describe("listSegmentContacts: run", () => {
  it("GETs /segments/{segment_id}/contacts with the encoded segment id and returns the parsed list", async () => {
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

    const input = listSegmentContactsDefinition.inputSchema.parse({
      segment_id: "seg 1",
    });
    const { data } = await listSegmentContactsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]?.url));
    expect(url.origin + url.pathname).toBe(
      "https://api.resend.com/segments/seg%201/contacts",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data[0]?.id).toBe("c1");
    expect(
      listSegmentContactsDefinition.outputSchema.safeParse(data).success,
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

    const input = listSegmentContactsDefinition.inputSchema.parse({
      segment_id: "seg_1",
    });
    await listSegmentContactsDefinition.run(input, { fetch: fakeFetch });

    const url = new URL(String(calls[0]?.url));
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Segment not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = listSegmentContactsDefinition.inputSchema.parse({
      segment_id: "seg_missing",
    });
    const err = await listSegmentContactsDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
