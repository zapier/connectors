import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteContactDefinition from "../scripts/deleteContact.ts";

const { outputSchema } = deleteContactDefinition;

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

describe("deleteContact: run", () => {
  it("DELETEs {resourceName}:deleteContact and returns success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse("");
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteContactDefinition.run(
      { resourceName: "people/c1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toBe(
      "https://people.googleapis.com/v1/people/c1:deleteContact",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: { code: 404, status: "NOT_FOUND", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const err = await deleteContactDefinition
      .run({ resourceName: "people/missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
