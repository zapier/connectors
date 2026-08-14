import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import removeItemPermissionDefinition from "../scripts/removeItemPermission.ts";

const { outputSchema } = removeItemPermissionDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function noContent(): Response {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("204 has no body");
    },
  } as unknown as Response;
}

function errorResponse(body: unknown, status: number): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("removeItemPermission: run", () => {
  it("DELETEs the permission and synthesizes { success: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noContent();
    }) as typeof globalThis.fetch;

    const { data } = await removeItemPermissionDefinition.run(
      { itemId: "01FILE", permissionId: "perm-1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/me/drive/items/01FILE/permissions/perm-1`,
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return noContent();
    }) as typeof globalThis.fetch;

    await removeItemPermissionDefinition.run(
      { itemId: "01FILE", permissionId: "perm-1", driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(
      `${GRAPH}/drives/drive-9/items/01FILE/permissions/perm-1`,
    );
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      errorResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        404,
      )) as typeof globalThis.fetch;

    const err = await removeItemPermissionDefinition
      .run({ itemId: "01FILE", permissionId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
