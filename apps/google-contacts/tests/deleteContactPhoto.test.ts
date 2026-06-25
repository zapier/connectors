import { describe, expect, it } from "vitest";

import deleteContactPhotoDefinition from "../scripts/deleteContactPhoto.ts";

const { outputSchema } = deleteContactPhotoDefinition;

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

describe("deleteContactPhoto: run", () => {
  it("DELETEs {resourceName}:deleteContactPhoto and returns the updated person", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ person: { resourceName: "people/c1" } });
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteContactPhotoDefinition.run(
      { resourceName: "people/c1", personFields: "names,metadata" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/v1/people/c1:deleteContactPhoto");
    expect(result.person?.resourceName).toBe("people/c1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
