import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listEventsDefinition from "../scripts/listEvents.ts";

const { outputSchema } = listEventsDefinition;

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

describe("listEvents: run", () => {
  it("remaps items/nextPageToken to events/next_page_token and defaults maxResults=10", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [{ id: "e1", status: "confirmed" }],
        nextPageToken: "tok",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listEventsDefinition.run(
      { calendarId: "primary" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/calendars/primary/events");
    // maxResults defaults to 10 when not passed.
    expect(calls[0]?.url).toContain("maxResults=10");

    // Wire remap: items -> events, nextPageToken -> next_page_token.
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.id).toBe("e1");
    expect(result.next_page_token).toBe("tok");
  });

  it("sends eventTypes as repeated query params, not comma-joined", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ items: [] });
    }) as typeof globalThis.fetch;

    await listEventsDefinition.run(
      { calendarId: "primary", eventTypes: ["default", "focusTime"] },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("eventTypes=default");
    expect(calls[0]?.url).toContain("eventTypes=focusTime");
    // NOT comma-joined into a single param.
    expect(calls[0]?.url).not.toContain("eventTypes=default%2CfocusTime");
    expect(calls[0]?.url).not.toContain("eventTypes=default,focusTime");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "Not Found",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listEventsDefinition
      .run({ calendarId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });
});
