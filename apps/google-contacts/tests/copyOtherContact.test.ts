import { describe, expect, it } from "vitest";

import copyOtherContactDefinition from "../scripts/copyOtherContact.ts";

const { outputSchema } = copyOtherContactDefinition;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("copyOtherContact: run", () => {
  it("POSTs {resourceName}:copyOtherContactToMyContactsGroup with copyMask, slash unencoded", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ resourceName: "people/c1" });
    }) as typeof globalThis.fetch;

    const { data: result } = await copyOtherContactDefinition.run(
      {
        resourceName: "otherContacts/c1",
        copyMask: "names,emailAddresses,phoneNumbers",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain(
      "/v1/otherContacts/c1:copyOtherContactToMyContactsGroup",
    );
    expect(calls[0]?.url).not.toContain("otherContacts%2Fc1");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.copyMask).toBe("names,emailAddresses,phoneNumbers");
    expect(result.resourceName).toBe("people/c1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
