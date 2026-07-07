import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import removeItemPermissionDefinition from "../scripts/removeItemPermission.ts";

const { outputSchema } = removeItemPermissionDefinition;

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

/** A 204 No Content response — empty body; .json() would throw if called. */
function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("no body on 204");
    },
  } as unknown as Response;
}

describe("removeItemPermission: run", () => {
  it("DELETEs the permission on the default library and returns { success: true } on 204", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noContentResponse();
    }) as typeof globalThis.fetch;

    const { data } = await removeItemPermissionDefinition.run(
      { siteId: "site-123", itemId: "01FILEITEM", permissionId: "perm-a" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drive/items/01FILEITEM/permissions/perm-a`,
    );
    expect(calls[0]?.init?.method).toBe("DELETE");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.success).toBe(true);
  });

  it("targets an explicit drive when driveId is set", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return noContentResponse();
    }) as typeof globalThis.fetch;

    await removeItemPermissionDefinition.run(
      {
        siteId: "site-123",
        driveId: "drive-9",
        itemId: "01FILEITEM",
        permissionId: "perm-a",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drives/drive-9/items/01FILEITEM/permissions/perm-a`,
    );
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await removeItemPermissionDefinition
      .run(
        { siteId: "site-123", itemId: "01FILEITEM", permissionId: "perm-a" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
