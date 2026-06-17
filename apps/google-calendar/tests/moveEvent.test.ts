import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import moveEventDefinition from "../scripts/moveEvent.ts";

const { inputSchema, outputSchema } = moveEventDefinition;

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

describe("moveEvent: run", () => {
  it("POSTs to /events/{eventId}/move with destination + sendUpdates query params and no body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await moveEventDefinition.run(
      {
        calendarId: "primary",
        eventId: "evt_1",
        destination: "team@example.com",
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe(
      "/calendar/v3/calendars/primary/events/evt_1/move",
    );
    expect(url.searchParams.get("destination")).toBe("team@example.com");
    expect(url.searchParams.get("sendUpdates")).toBe("all");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBeUndefined();

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("evt_1");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "forbidden",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await moveEventDefinition
      .run(
        {
          calendarId: "primary",
          eventId: "evt_1",
          destination: "other",
          sendUpdates: "all",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(403);
  });

  it("defaults sendUpdates to all", () => {
    const parsed = inputSchema.parse({
      calendarId: "primary",
      eventId: "evt_1",
      destination: "team@example.com",
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
