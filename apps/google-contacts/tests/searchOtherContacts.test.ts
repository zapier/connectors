import { describe, expect, it } from "vitest";

import searchOtherContactsDefinition from "../scripts/searchOtherContacts.ts";

const { outputSchema } = searchOtherContactsDefinition;

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

describe("searchOtherContacts: run", () => {
  it("GETs otherContacts:search with the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        results: [{ person: { resourceName: "otherContacts/c1" } }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchOtherContactsDefinition.run(
      { query: "bob", readMask: "names,emailAddresses,metadata" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/v1/otherContacts:search");
    expect(calls[0]?.url).toContain("query=bob");
    expect(result.results?.[0]?.person?.resourceName).toBe("otherContacts/c1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
