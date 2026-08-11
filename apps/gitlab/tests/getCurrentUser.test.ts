import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getCurrentUser from "../scripts/getCurrentUser.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...init.headers,
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("getCurrentUser: run", () => {
  it("GETs /user and returns the authenticated identity", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 7,
        username: "octocat",
        name: "Octo Cat",
        email: "octo@example.com",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getCurrentUser.run(
      getCurrentUser.inputSchema.parse({}),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://gitlab.com/api/v4/user");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data).toMatchObject({ id: 7, username: "octocat" });
    expect(getCurrentUser.outputSchema.safeParse(data).success).toBe(true);
  });

  it("accepts a null email", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        id: 1,
        username: "u",
        name: "n",
        email: null,
      })) as typeof globalThis.fetch;

    const { data } = await getCurrentUser.run(
      getCurrentUser.inputSchema.parse({}),
      { fetch: fakeFetch },
    );
    expect(data.email).toBeNull();
    expect(getCurrentUser.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "401 Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getCurrentUser
      .run(getCurrentUser.inputSchema.parse({}), { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
