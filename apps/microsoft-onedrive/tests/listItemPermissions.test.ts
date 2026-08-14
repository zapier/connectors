import { describe, expect, it } from "vitest";

import listItemPermissionsDefinition from "../scripts/listItemPermissions.ts";

const { outputSchema } = listItemPermissionsDefinition;

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

describe("listItemPermissions: run", () => {
  it("GETs /me/drive/items/{id}/permissions, sets $top, unwraps the envelope", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [{ id: "perm-1", roles: ["read"] }] });
    }) as typeof globalThis.fetch;

    const { data } = await listItemPermissionsDefinition.run(
      { itemId: "01FILE", limit: 5 },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!);
    expect(url.pathname).toBe("/v1.0/me/drive/items/01FILE/permissions");
    expect(url.searchParams.get("$top")).toBe("5");
    expect(data.items).toHaveLength(1);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listItemPermissionsDefinition.run(
      { itemId: "01FILE", driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain(
      `${GRAPH}/drives/drive-9/items/01FILE/permissions`,
    );
  });
});
