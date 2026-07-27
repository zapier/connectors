import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getEmailDefinition from "../scripts/getEmail.ts";

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

describe("getEmail: run", () => {
  it("GETs /emails/{id} and returns the parsed email", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "email",
        id: "e1",
        to: ["a@example.com"],
        from: "me@example.com",
        subject: "Hi",
        created_at: "2026-07-09T00:00:00Z",
        last_event: "delivered",
      });
    }) as typeof globalThis.fetch;

    const input = getEmailDefinition.inputSchema.parse({ email_id: "e1" });
    const { data } = await getEmailDefinition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/emails/e1");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.last_event).toBe("delivered");
    expect(getEmailDefinition.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes the email id into the path", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "email",
        id: "a/b c",
        to: ["a@example.com"],
        from: "me@example.com",
        subject: "Hi",
        created_at: "2026-07-09T00:00:00Z",
        last_event: "sent",
      });
    }) as typeof globalThis.fetch;

    const input = getEmailDefinition.inputSchema.parse({ email_id: "a/b c" });
    await getEmailDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe("https://api.resend.com/emails/a%2Fb%20c");
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { name: "not_found", message: "Email not found.", statusCode: 404 },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = getEmailDefinition.inputSchema.parse({ email_id: "missing" });
    const err = await getEmailDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
