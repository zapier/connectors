import { describe, expect, it } from "vitest";

import searchContactsDefinition from "../scripts/searchContacts.ts";

const { outputSchema } = searchContactsDefinition;

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

describe("searchContacts: run", () => {
  it("GETs people:searchContacts with the query and renames nextPageToken", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        results: [{ person: { resourceName: "people/c1" } }],
        nextPageToken: "tok",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchContactsDefinition.run(
      { query: "jane", readMask: "names,emailAddresses,metadata" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/v1/people:searchContacts");
    expect(calls[0]?.url).toContain("query=jane");
    expect(result.results?.[0]?.person?.resourceName).toBe("people/c1");
    expect(result.next_page_token).toBe("tok");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
