import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listItemPermissionsDefinition from "../scripts/listItemPermissions.ts";

const { outputSchema } = listItemPermissionsDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";
const NEXT_LINK =
  "https://graph.microsoft.com/v1.0/sites/site-123/drive/items/01FILEITEM/permissions?$skiptoken=OPAQUE";

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

describe("listItemPermissions: run", () => {
  it("GETs the default-library permissions, sets $top from limit, and unwraps the envelope to { items, next_cursor }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "perm-a", roles: ["read"] }],
        "@odata.nextLink": NEXT_LINK,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listItemPermissionsDefinition.run(
      { siteId: "site-123", itemId: "01FILEITEM", limit: 10 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drive/items/01FILEITEM/permissions?%24top=10`,
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.id).toBe("perm-a");
    expect(data.next_cursor).toBe(NEXT_LINK);
  });

  it("targets an explicit drive when driveId is set", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const { data } = await listItemPermissionsDefinition.run(
      { siteId: "site-123", driveId: "drive-9", itemId: "01FILEITEM" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      `${GRAPH}/sites/site-123/drives/drive-9/items/01FILEITEM/permissions`,
    );
    // No @odata.nextLink → no next_cursor key.
    expect(data.next_cursor).toBeUndefined();
  });

  it("fetches the opaque cursor verbatim, ignoring the base URL", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listItemPermissionsDefinition.run(
      { siteId: "site-123", itemId: "01FILEITEM", cursor: NEXT_LINK },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(NEXT_LINK);
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listItemPermissionsDefinition
      .run({ siteId: "site-123", itemId: "01FILEITEM" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
