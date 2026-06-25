import { describe, expect, it } from "vitest";

import getContactGroupDefinition from "../scripts/getContactGroup.ts";

const { outputSchema } = getContactGroupDefinition;

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

describe("getContactGroup: run", () => {
  it("GETs /v1/{resourceName} with groupFields and maxMembers, slash unencoded", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({
        resourceName: "contactGroups/g1",
        name: "Friends",
        memberResourceNames: ["people/c1"],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getContactGroupDefinition.run(
      {
        resourceName: "contactGroups/g1",
        maxMembers: 50,
        groupFields: "name,groupType,memberCount",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/v1/contactGroups/g1");
    expect(calls[0]?.url).not.toContain("contactGroups%2Fg1");
    expect(calls[0]?.url).toContain("maxMembers=50");
    expect(result.memberResourceNames?.[0]).toBe("people/c1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
