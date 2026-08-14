import { describe, expect, it } from "vitest";

import createSharingLinkDefinition from "../scripts/createSharingLink.ts";

const { outputSchema } = createSharingLinkDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const PERMISSION = {
  id: "perm-1",
  link: { type: "view", scope: "anonymous", webUrl: "https://1drv.ms/abc" },
};

describe("createSharingLink: run", () => {
  it("POSTs createLink with the type and returns the link permission", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PERMISSION);
    }) as typeof globalThis.fetch;

    const { data } = await createSharingLinkDefinition.run(
      { itemId: "01FILE", type: "view" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(`${GRAPH}/me/drive/items/01FILE/createLink`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      type: "view",
    });
    expect(data.link?.webUrl).toBe("https://1drv.ms/abc");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("includes scope + expiration and targets an explicit driveId", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PERMISSION);
    }) as typeof globalThis.fetch;

    await createSharingLinkDefinition.run(
      {
        itemId: "01FILE",
        driveId: "drive-9",
        type: "edit",
        scope: "organization",
        expirationDateTime: "2030-01-01T00:00:00Z",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/drives/drive-9/items/01FILE/createLink`,
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      type: "edit",
      scope: "organization",
      expirationDateTime: "2030-01-01T00:00:00Z",
    });
  });
});
