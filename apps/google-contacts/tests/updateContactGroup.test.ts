import { describe, expect, it } from "vitest";

import updateContactGroupDefinition from "../scripts/updateContactGroup.ts";

const { outputSchema } = updateContactGroupDefinition;

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

describe("updateContactGroup: run", () => {
  it("read-modify-writes: GETs the etag, then PUTs contactGroup.etag + name", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (calls.length === 1)
        return jsonResponse({
          resourceName: "contactGroups/g1",
          etag: "etag-1",
        });
      return jsonResponse({
        resourceName: "contactGroups/g1",
        name: "Renamed",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateContactGroupDefinition.run(
      { resourceName: "contactGroups/g1", name: "Renamed" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[1]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.contactGroup.etag).toBe("etag-1");
    expect(body.contactGroup.name).toBe("Renamed");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });
});
