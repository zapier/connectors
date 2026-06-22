import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createContactGroupDefinition from "../scripts/createContactGroup.ts";

const { outputSchema } = createContactGroupDefinition;

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

describe("createContactGroup: run", () => {
  it("POSTs contactGroups with the name wrapped in contactGroup", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({
        resourceName: "contactGroups/g1",
        name: "Friends",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createContactGroupDefinition.run(
      { name: "Friends" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/v1/contactGroups");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.contactGroup.name).toBe("Friends");
    expect(result.resourceName).toBe("contactGroups/g1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError on 409 ALREADY_EXISTS", async () => {
    const fakeFetch = (async () =>
      jsonResponse(
        { error: { code: 409, status: "ALREADY_EXISTS", message: "dup" } },
        { status: 409 },
      )) as typeof globalThis.fetch;
    const err = await createContactGroupDefinition
      .run({ name: "Friends" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(409);
  });
});
