import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteAclRuleDefinition from "../scripts/deleteAclRule.ts";

const { outputSchema } = deleteAclRuleDefinition;

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

describe("deleteAclRule: run", () => {
  it("DELETEs /calendars/{id}/acl/{ruleId} with the ruleId URL-encoded and returns { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("", { status: 204 });
    }) as typeof globalThis.fetch;

    const { data } = await deleteAclRuleDefinition.run(
      { calendarId: "primary", ruleId: "user:alice@example.com" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("DELETE");
    // ruleId is URL-encoded in the path (`:` and `@` escaped).
    expect(calls[0]?.url).toContain("user%3Aalice%40example.com");
    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe(
      "/calendar/v3/calendars/primary/acl/user%3Aalice%40example.com",
    );

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.success).toBe(true);
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

    const err = await deleteAclRuleDefinition
      .run(
        { calendarId: "primary", ruleId: "user:alice@example.com" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });
});
