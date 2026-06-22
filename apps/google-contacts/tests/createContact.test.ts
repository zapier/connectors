import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createContactDefinition from "../scripts/createContact.ts";

const { outputSchema } = createContactDefinition;

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
  it("POSTs people:createContact and nests memberships under contactGroupMembership", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ resourceName: "people/c1", etag: "e" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createContactDefinition.run(
      {
        names: [{ givenName: "Jane", familyName: "Doe" }],
        emailAddresses: [{ value: "jane@example.com" }],
        memberships: [{ contactGroupResourceName: "contactGroups/g1" }],
        personFields: "names,metadata",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/v1/people:createContact");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(
      body.memberships[0].contactGroupMembership.contactGroupResourceName,
    ).toBe("contactGroups/g1");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.resourceName).toBe("people/c1");
  });

  it("throws a ConnectorHttpError on 400 INVALID_ARGUMENT", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: { code: 400, status: "INVALID_ARGUMENT", message: "bad" } },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const err = await createContactDefinition
      .run(
        { names: [{ givenName: "X" }], personFields: "names,metadata" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
