import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteContactDefinition from "../scripts/deleteContact.ts";

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
  it("DELETEs /contacts/{id} and returns the parsed result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "contact", contact: "c1", deleted: true });
    }) as typeof globalThis.fetch;

    const input = deleteContactDefinition.inputSchema.parse({ id: "c1" });
    const { data } = await deleteContactDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts/c1");
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data.deleted).toBe(true);
    expect(deleteContactDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("URL-encodes an email address into the path", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "contact", contact: null, deleted: true });
    }) as typeof globalThis.fetch;

    const input = deleteContactDefinition.inputSchema.parse({
      id: "user+tag@example.com",
    });
    await deleteContactDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://api.resend.com/contacts/user%2Btag%40example.com",
    );
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { name: "not_found", message: "Contact not found.", statusCode: 404 },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = deleteContactDefinition.inputSchema.parse({ id: "missing" });
    const err = await deleteContactDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
