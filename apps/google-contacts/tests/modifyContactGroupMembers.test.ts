import { describe, expect, it } from "vitest";

import modifyContactGroupMembersDefinition from "../scripts/modifyContactGroupMembers.ts";

const { outputSchema } = modifyContactGroupMembersDefinition;

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

describe("modifyContactGroupMembers: run", () => {
  it("POSTs {resourceName}/members:modify with add/remove arrays", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ notFoundResourceNames: [] });
    }) as typeof globalThis.fetch;

    const { data: result } = await modifyContactGroupMembersDefinition.run(
      {
        resourceName: "contactGroups/g1",
        resourceNamesToAdd: ["people/c1", "people/c2"],
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/v1/contactGroups/g1/members:modify");
    expect(calls[0]?.url).not.toContain("contactGroups%2Fg1");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.resourceNamesToAdd).toEqual(["people/c1", "people/c2"]);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
