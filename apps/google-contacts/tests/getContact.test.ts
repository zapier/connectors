import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getContactDefinition from "../scripts/getContact.ts";

const { outputSchema } = getContactDefinition;

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

describe("getContact: run", () => {
  it("GETs /v1/{resourceName} without percent-encoding the slash", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ resourceName: "people/c1", etag: "e" });
    }) as typeof globalThis.fetch;

    const { data: result } = await getContactDefinition.run(
      { resourceName: "people/c1", personFields: "names,metadata" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/v1/people/c1?");
    expect(calls[0]?.url).not.toContain("people%2Fc1");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resourceName).toBe("people/c1");
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const err = await getContactDefinition
      .run(
        { resourceName: "people/missing", personFields: "names,metadata" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
