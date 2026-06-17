import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listAclRulesDefinition from "../scripts/listAclRules.ts";

const { outputSchema } = listAclRulesDefinition;

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

describe("listAclRules: run", () => {
  it("GETs /calendars/{id}/acl with maxResults=20 default and remaps the wire shape", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [
          {
            id: "user:alice@example.com",
            role: "owner",
            scope: { type: "user", value: "alice@example.com" },
          },
        ],
        nextPageToken: "t",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listAclRulesDefinition.run(
      { calendarId: "primary" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/acl");
    expect(url.searchParams.get("maxResults")).toBe("20");

    // QUIRK: API `{ items, nextPageToken }` -> tool `{ rules, next_page_token }`.
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.rules[0]?.id).toBe("user:alice@example.com");
    expect(data.next_page_token).toBe("t");
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

    const err = await listAclRulesDefinition
      .run({ calendarId: "primary" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(403);
  });
});
