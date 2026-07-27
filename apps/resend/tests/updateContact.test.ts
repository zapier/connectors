import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateContactDefinition from "../scripts/updateContact.ts";

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
  it("PATCHes /contacts/{id}, sends only the body fields, and returns the parsed id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "contact", id: "c1" });
    }) as typeof globalThis.fetch;

    const input = updateContactDefinition.inputSchema.parse({
      id: "c1",
      first_name: "Ada",
      unsubscribed: true,
    });
    const { data } = await updateContactDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts/c1");
    expect(calls[0]?.init?.method).toBe("PATCH");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.first_name).toBe("Ada");
    expect(sent.unsubscribed).toBe(true);

    expect(data).toEqual({ object: "contact", id: "c1" });
    expect(updateContactDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("splits id into the path (encoded) and keeps it OUT of the request body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "contact", id: "c1" });
    }) as typeof globalThis.fetch;

    const input = updateContactDefinition.inputSchema.parse({
      id: "ada@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      unsubscribed: false,
      properties: { plan: "pro" },
    });
    await updateContactDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://api.resend.com/contacts/ada%40example.com",
    );

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect("id" in sent).toBe(false);
    expect(Object.keys(sent).sort()).toEqual([
      "first_name",
      "last_name",
      "properties",
      "unsubscribed",
    ]);
    expect(sent.properties).toEqual({ plan: "pro" });
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Contact not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = updateContactDefinition.inputSchema.parse({
      id: "missing",
      first_name: "Ada",
    });
    const err = await updateContactDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
