import { describe, expect, it } from "vitest";

import getItemByShareUrlDefinition from "../scripts/getItemByShareUrl.ts";

const { outputSchema } = getItemByShareUrlDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

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

const SHARED_ITEM = {
  id: "01SHARED",
  name: "shared.docx",
  remoteItem: {
    id: "01REMOTE",
    parentReference: { driveId: "owner-drive" },
  },
};

describe("getItemByShareUrl: run", () => {
  it("base64url-encodes an http(s) URL into a u! share token and GETs /shares/{token}/driveItem", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(SHARED_ITEM);
    }) as typeof globalThis.fetch;

    const sharingUrl = "https://contoso-my.sharepoint.com/:w:/g/abc123";
    const { data } = await getItemByShareUrlDefinition.run(
      { sharingUrl },
      { fetch: fakeFetch },
    );

    // Encode with the same algorithm the tool uses, then compare exactly.
    const token =
      "u!" +
      btoa(sharingUrl)
        .replace(/=+$/, "")
        .replace(/\//g, "_")
        .replace(/\+/g, "-");
    expect(calls[0]).toBe(
      `${GRAPH}/shares/${encodeURIComponent(token)}/driveItem`,
    );
    expect(data.remoteItem?.id).toBe("01REMOTE");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("passes a bare share id/token through unchanged (no encoding)", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(SHARED_ITEM);
    }) as typeof globalThis.fetch;

    await getItemByShareUrlDefinition.run(
      { sharingUrl: "u!existingtoken" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(
      `${GRAPH}/shares/${encodeURIComponent("u!existingtoken")}/driveItem`,
    );
  });
});
