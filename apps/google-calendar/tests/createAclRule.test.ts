import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createAclRuleDefinition from "../scripts/createAclRule.ts";

const { outputSchema } = createAclRuleDefinition;

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

describe("createAclRule: run", () => {
  it("POSTs /calendars/{id}/acl with a { role, scope } body (calendarId stays in the path)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "user:alice@example.com",
        role: "reader",
        scope: { type: "user", value: "alice@example.com" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await createAclRuleDefinition.run(
      {
        calendarId: "primary",
        role: "reader",
        scope: { type: "user", value: "alice@example.com" },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/acl");

    // calendarId is in the path, NOT the body.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      role: "reader",
      scope: { type: "user", value: "alice@example.com" },
    });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("user:alice@example.com");
  });

  it("promotes sendNotifications into a query param", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        id: "user:alice@example.com",
        role: "reader",
        scope: { type: "user", value: "alice@example.com" },
      });
    }) as typeof globalThis.fetch;

    await createAclRuleDefinition.run(
      {
        calendarId: "primary",
        role: "reader",
        scope: { type: "user", value: "alice@example.com" },
        sendNotifications: true,
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("sendNotifications")).toBe("true");
  });

  it("throws a ConnectorHttpError on a 403 response", async () => {
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

    const err = await createAclRuleDefinition
      .run(
        {
          calendarId: "primary",
          role: "reader",
          scope: { type: "user", value: "alice@example.com" },
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(403);
  });
});
