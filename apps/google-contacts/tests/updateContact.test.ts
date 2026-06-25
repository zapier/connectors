import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateContactDefinition from "../scripts/updateContact.ts";

const { outputSchema } = updateContactDefinition;

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

describe("updateContact: run", () => {
  it("read-modify-writes: GETs the etag, then PATCHes with a derived updatePersonFields mask", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (calls.length === 1)
        return jsonResponse({ resourceName: "people/c1", etag: "etag-123" });
      return jsonResponse({ resourceName: "people/c1", etag: "etag-456" });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateContactDefinition.run(
      {
        resourceName: "people/c1",
        emailAddresses: [{ value: "new@example.com" }],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(calls[1]?.url).toContain("updatePersonFields=emailAddresses");
    expect(calls[1]?.url).toContain("/v1/people/c1:updateContact");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.etag).toBe("etag-123");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("rebuilds unstructuredName from name parts when omitted", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      calls.push({ init });
      if (calls.length === 1) return jsonResponse({ etag: "e" });
      return jsonResponse({ resourceName: "people/c1" });
    }) as typeof globalThis.fetch;

    await updateContactDefinition.run(
      {
        resourceName: "people/c1",
        names: [{ givenName: "Jane", familyName: "Doe" }],
      },
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.names[0].unstructuredName).toBe("Jane Doe");
  });

  it("throws when no updatable field is supplied", async () => {
    const fakeFetch = (async () => jsonResponse({})) as typeof globalThis.fetch;
    const err = await updateContactDefinition
      .run({ resourceName: "people/c1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
  });

  it("throws a ConnectorHttpError on a stale etag (400 FAILED_PRECONDITION)", async () => {
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === "GET") return jsonResponse({ etag: "e" });
      return jsonResponse(
        {
          error: { code: 400, status: "FAILED_PRECONDITION", message: "stale" },
        },
        { status: 400 },
      );
    }) as typeof globalThis.fetch;
    const err = await updateContactDefinition
      .run(
        {
          resourceName: "people/c1",
          emailAddresses: [{ value: "new@example.com" }],
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
