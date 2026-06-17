import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listEventInstancesDefinition from "../scripts/listEventInstances.ts";

const { outputSchema } = listEventInstancesDefinition;

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

describe("listEventInstances: run", () => {
  it("hits /events/{eventId}/instances and remaps items/nextPageToken to instances/next_page_token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [{ id: "e1_20260616", status: "confirmed" }],
        nextPageToken: "tok",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listEventInstancesDefinition.run(
      { calendarId: "primary", eventId: "e1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/calendars/primary/events/e1/instances");

    // Wire remap: items -> instances, nextPageToken -> next_page_token.
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.id).toBe("e1_20260616");
    expect(result.next_page_token).toBe("tok");
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

    const err = await listEventInstancesDefinition
      .run({ calendarId: "primary", eventId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });
});
