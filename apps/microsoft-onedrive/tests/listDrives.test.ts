import { describe, expect, it } from "vitest";

import listDrivesDefinition from "../scripts/listDrives.ts";

const { outputSchema } = listDrivesDefinition;

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

describe("listDrives: run", () => {
  it("GETs /me/drives, sets $top, and unwraps the envelope", async () => {
    const calls: string[] = [];
    const nextLink = `${GRAPH}/me/drives?$skiptoken=abc`;
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        value: [{ id: "drive-1", name: "OneDrive", driveType: "personal" }],
        "@odata.nextLink": nextLink,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listDrivesDefinition.run(
      { limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(`${GRAPH}/me/drives?%24top=5`);
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(nextLink);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("follows the opaque cursor verbatim on a follow-up page", async () => {
    const cursor = `${GRAPH}/me/drives?$skiptoken=page2`;
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const { data } = await listDrivesDefinition.run(
      { cursor },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(cursor);
    expect(data.next_cursor).toBeUndefined();
  });
});
