import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createContactDefinition from "../scripts/createContact.ts";

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

describe("createContact: run", () => {
  it("POSTs /contacts, sends the body, and returns the parsed id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "contact", id: "c1" });
    }) as typeof globalThis.fetch;

    const input = createContactDefinition.inputSchema.parse({
      email: "a@example.com",
      first_name: "A",
      properties: { plan: "pro", seats: 5 },
    });
    const { data } = await createContactDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/contacts");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.email).toBe("a@example.com");
    expect(sent.properties).toEqual({ plan: "pro", seats: 5 });

    expect(data).toEqual({ object: "contact", id: "c1" });
    expect(createContactDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError with the restricted-key hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "restricted_api_key",
          message: "This API key is restricted to sending emails.",
          statusCode: 401,
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const input = createContactDefinition.inputSchema.parse({
      email: "a@example.com",
    });
    const err = await createContactDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
