import { describe, expect, it } from "vitest";

import listContactGroupsDefinition from "../scripts/listContactGroups.ts";

const { outputSchema } = listContactGroupsDefinition;

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

describe("listContactGroups: run", () => {
  it("GETs contactGroups and renames nextPageToken", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        contactGroups: [
          {
            resourceName: "contactGroups/g1",
            name: "Friends",
            groupType: "USER_CONTACT_GROUP",
          },
        ],
        nextPageToken: "tok",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listContactGroupsDefinition.run(
      { groupFields: "name,groupType,memberCount" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/v1/contactGroups");
    expect(result.contactGroups?.[0]?.resourceName).toBe("contactGroups/g1");
    expect(result.next_page_token).toBe("tok");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
