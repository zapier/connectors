import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getEventDefinition from "../scripts/getEvent.ts";

const { outputSchema } = getEventDefinition;

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

describe("getEvent: run", () => {
  it("GETs /calendars/{id}/events/{eventId} and returns the Event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "e1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await getEventDefinition.run(
      { calendarId: "primary", eventId: "e1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/e1",
    );

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("e1");
    expect(result.status).toBe("confirmed");
  });

  it("throws a ConnectorHttpError on a 404 response", async () => {
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

    const err = await getEventDefinition
      .run({ calendarId: "primary", eventId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });
});
