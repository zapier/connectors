import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import quickAddEventDefinition from "../scripts/quickAddEvent.ts";

const { inputSchema, outputSchema } = quickAddEventDefinition;

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

describe("quickAddEvent: run", () => {
  it("POSTs to /events/quickAdd carrying the text phrase + sendUpdates query params", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const phrase = "Lunch with Sam tomorrow 12pm";
    const { data: result } = await quickAddEventDefinition.run(
      { calendarId: "primary", text: phrase, sendUpdates: "all" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events/quickAdd");
    expect(url.searchParams.get("text")).toBe(phrase);
    expect(url.searchParams.get("sendUpdates")).toBe("all");
    expect(calls[0]?.init?.method).toBe("POST");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("evt_1");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "bad text",
            errors: [{ reason: "invalid" }],
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await quickAddEventDefinition
      .run(
        { calendarId: "primary", text: "???", sendUpdates: "all" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(400);
  });

  it("defaults sendUpdates to all", () => {
    const parsed = inputSchema.parse({
      calendarId: "primary",
      text: "Lunch with Sam tomorrow 12pm",
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
