import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listDrivesDefinition from "../scripts/listDrives.ts";

const { outputSchema } = listDrivesDefinition;

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

describe("listDrives: run", () => {
  it("GETs /sites/{id}/drives with $top and unwraps the list envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          { id: "drive-1", name: "Documents", driveType: "documentLibrary" },
        ],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/site-1/drives?skiptoken=abc",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listDrivesDefinition.run(
      { siteId: "site-1", limit: 3 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives?%24top=3",
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives?skiptoken=abc",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("fetches an opaque cursor (nextLink) verbatim", async () => {
    const calls: Array<{ url: string }> = [];
    const cursor =
      "https://graph.microsoft.com/v1.0/sites/site-1/drives?%24skiptoken=OPAQUE";
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listDrivesDefinition.run(
      { siteId: "site-1", cursor },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a ConnectorHttpError carrying the status on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listDrivesDefinition
      .run({ siteId: "site-1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
