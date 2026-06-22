import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteEventDefinition from "../scripts/deleteEvent.ts";

const { inputSchema, outputSchema } = deleteEventDefinition;

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

describe("deleteEvent: run", () => {
  it("DELETEs the event and returns { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("", { status: 204 });
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteEventDefinition.run(
      { calendarId: "primary", eventId: "evt_1", sendUpdates: "all" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events/evt_1");
    expect(url.searchParams.get("sendUpdates")).toBe("all");
    expect(calls[0]?.init?.method).toBe("DELETE");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("treats a 410 Gone as soft-success and returns { success: true }", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 410,
            message: "deleted",
            errors: [{ reason: "deleted" }],
          },
        },
        { status: 410 },
      )) as typeof globalThis.fetch;

    const { data: result } = await deleteEventDefinition.run(
      { calendarId: "primary", eventId: "already-gone", sendUpdates: "all" },
      { fetch: fakeFetch },
    );

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("throws a ConnectorHttpError on a 404 (id never existed)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "not found",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await deleteEventDefinition
      .run(
        { calendarId: "primary", eventId: "missing", sendUpdates: "all" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });

  it("defaults sendUpdates to all", () => {
    const parsed = inputSchema.parse({
      calendarId: "primary",
      eventId: "evt_1",
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
