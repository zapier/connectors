import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createSharingLinkDefinition from "../scripts/createSharingLink.ts";

const { outputSchema } = createSharingLinkDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

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

const LINK_PERMISSION = {
  id: "perm-link-1",
  roles: ["read"],
  link: {
    type: "view",
    scope: "organization",
    webUrl: "https://contoso.sharepoint.com/:b:/s/share/xyz",
  },
};

describe("createSharingLink: run", () => {
  it("POSTs createLink against the default library with the type-only body and returns the permission", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LINK_PERMISSION, { status: 201 });
    }) as typeof globalThis.fetch;

    const { data } = await createSharingLinkDefinition.run(
      { siteId: "site-123", itemId: "01FILEITEM", type: "view" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drive/items/01FILEITEM/createLink`,
    );
    expect(calls[0]?.init?.method).toBe("POST");
    // Only `type` is sent when scope/expiration are omitted.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      type: "view",
    });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("perm-link-1");
    expect(data.link?.webUrl).toContain("sharepoint.com");
  });

  it("includes scope + expirationDateTime in the body and targets an explicit drive", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LINK_PERMISSION);
    }) as typeof globalThis.fetch;

    await createSharingLinkDefinition.run(
      {
        siteId: "site-123",
        driveId: "drive-9",
        itemId: "01FILEITEM",
        type: "edit",
        scope: "organization",
        expirationDateTime: "2030-01-01T00:00:00Z",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drives/drive-9/items/01FILEITEM/createLink`,
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      type: "edit",
      scope: "organization",
      expirationDateTime: "2030-01-01T00:00:00Z",
    });
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createSharingLinkDefinition
      .run(
        { siteId: "site-123", itemId: "01FILEITEM", type: "view" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
