import { describe, expect, it } from "vitest";

import getMeDefinition from "../scripts/getMe.ts";

const { outputSchema } = getMeDefinition;

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

describe("getMe: run", () => {
  it("GETs /me and returns the parsed profile", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "abc123",
        displayName: "Jane Doe",
        mail: "jane@contoso.com",
        userPrincipalName: "jane@contoso.com",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getMeDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me");
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.userPrincipalName).toBe("jane@contoso.com");
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getMeDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook getMe");
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });

  it("parses a minimal profile that omits the optional fields", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        id: "abc123",
        userPrincipalName: "jane@contoso.com",
      })) as typeof globalThis.fetch;

    const { data } = await getMeDefinition.run({}, { fetch: fakeFetch });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.displayName).toBeUndefined();
  });

  it("strips the explicit nulls Graph returns for empty optional fields", async () => {
    // Microsoft Graph returns null (not a missing key) for empty optional
    // scalars; the connector must map those to absent so output validation
    // (which uses .optional(), not .nullish()) still passes.
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        id: "abc123",
        displayName: "Jane Doe",
        mail: "jane@contoso.com",
        userPrincipalName: "jane@contoso.com",
        jobTitle: null,
        mobilePhone: null,
      })) as typeof globalThis.fetch;

    const { data } = await getMeDefinition.run({}, { fetch: fakeFetch });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.jobTitle).toBeUndefined();
    expect(data.mobilePhone).toBeUndefined();
  });
});
