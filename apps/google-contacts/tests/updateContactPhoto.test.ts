import { describe, expect, it } from "vitest";

import updateContactPhotoDefinition from "../scripts/updateContactPhoto.ts";

const { outputSchema } = updateContactPhotoDefinition;

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

describe("updateContactPhoto: run", () => {
  it("PATCHes {resourceName}:updateContactPhoto with photoBytes", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ person: { resourceName: "people/c1" } });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateContactPhotoDefinition.run(
      {
        resourceName: "people/c1",
        photoBytes: "aGVsbG8=",
        personFields: "names,photos,metadata",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(calls[0]?.url).toContain("/v1/people/c1:updateContactPhoto");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.photoBytes).toBe("aGVsbG8=");
    expect(result.person?.resourceName).toBe("people/c1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
