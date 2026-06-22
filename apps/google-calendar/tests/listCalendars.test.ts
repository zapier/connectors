import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCalendarsDefinition from "../scripts/listCalendars.ts";

const { outputSchema } = listCalendarsDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("listCalendars: run", () => {
  it("remaps the wire { items, nextPageToken } to { calendars, next_page_token }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [{ id: "primary", accessRole: "owner" }],
        nextPageToken: "t",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCalendarsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.calendars).toHaveLength(1);
    expect(data.calendars[0]?.id).toBe("primary");
    expect(data.next_page_token).toBe("t");
  });

  it("sets maxResults=20 by default in the request URL", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ items: [] });
    }) as typeof globalThis.fetch;

    await listCalendarsDefinition.run({}, { fetch: fakeFetch });

    const parsed = new URL(calls[0]?.url ?? "");
    expect(parsed.searchParams.get("maxResults")).toBe("20");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 401, message: "Invalid Credentials" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listCalendarsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
  });
});
