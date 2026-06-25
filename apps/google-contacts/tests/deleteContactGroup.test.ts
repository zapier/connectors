import { describe, expect, it } from "vitest";

import deleteContactGroupDefinition from "../scripts/deleteContactGroup.ts";

const { outputSchema } = deleteContactGroupDefinition;

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

describe("deleteContactGroup: run", () => {
  it("DELETEs {resourceName} with deleteContacts and returns success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse("");
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteContactGroupDefinition.run(
      { resourceName: "contactGroups/g1", deleteContacts: true },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/v1/contactGroups/g1");
    expect(calls[0]?.url).toContain("deleteContacts=true");
    expect(result.success).toBe(true);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
