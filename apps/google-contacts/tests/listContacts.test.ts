import { describe, expect, it } from "vitest";

import listContactsDefinition from "../scripts/listContacts.ts";

const { outputSchema } = listContactsDefinition;

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

describe("listContacts: run", () => {
  it("GETs people/me/connections and renames connections/nextPageToken/totalPeople", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        connections: [{ resourceName: "people/c1" }],
        nextPageToken: "tok",
        totalPeople: 1,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listContactsDefinition.run(
      { personFields: "names,metadata" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/v1/people/me/connections");
    expect(result.contacts?.[0]?.resourceName).toBe("people/c1");
    expect(result.next_page_token).toBe("tok");
    expect(result.total_people).toBe(1);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
