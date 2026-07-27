import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import sendEventDefinition from "../scripts/sendEvent.ts";

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

describe("sendEvent: input validation (superRefine exactly-one)", () => {
  it("rejects providing neither contact_id nor email", () => {
    expect(
      sendEventDefinition.inputSchema.safeParse({ event: "user.created" })
        .success,
    ).toBe(false);
  });

  it("rejects providing both contact_id and email", () => {
    expect(
      sendEventDefinition.inputSchema.safeParse({
        event: "user.created",
        contact_id: "c_1",
        email: "user@example.com",
      }).success,
    ).toBe(false);
  });

  it("accepts providing exactly one of contact_id or email", () => {
    expect(
      sendEventDefinition.inputSchema.safeParse({
        event: "user.created",
        contact_id: "c_1",
      }).success,
    ).toBe(true);
    expect(
      sendEventDefinition.inputSchema.safeParse({
        event: "user.created",
        email: "user@example.com",
      }).success,
    ).toBe(true);
  });
});

describe("sendEvent: run", () => {
  it("POSTs /events/send with the body and passes payload through", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "event", event: "user.created" });
    }) as typeof globalThis.fetch;

    const input = sendEventDefinition.inputSchema.parse({
      event: "user.created",
      email: "user@example.com",
      payload: { plan: "pro", seats: 5, nested: { flag: true } },
    });
    const { data } = await sendEventDefinition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/events/send");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.event).toBe("user.created");
    expect(sent.email).toBe("user@example.com");
    // Arbitrary JSON payload rides through untouched.
    expect(sent.payload).toEqual({
      plan: "pro",
      seats: 5,
      nested: { flag: true },
    });

    expect(data).toEqual({ object: "event", event: "user.created" });
    expect(sendEventDefinition.outputSchema.safeParse(data).success).toBe(true);
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "No automation matched that event.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = sendEventDefinition.inputSchema.parse({
      event: "user.created",
      contact_id: "c_1",
    });
    const err = await sendEventDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
