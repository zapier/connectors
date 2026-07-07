import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findSitesDefinition from "../scripts/findSites.ts";

const { outputSchema } = findSitesDefinition;

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

describe("findSites: run", () => {
  it("GETs /sites with the search + $top params and unwraps the list envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          { id: "site-1", displayName: "Marketing", webUrl: "https://x" },
        ],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites?skiptoken=abc",
      });
    }) as typeof globalThis.fetch;

    const { data } = await findSitesDefinition.run(
      { search: "marketing", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites?%24top=5&search=marketing",
    );
    // No init.method means a GET.
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/sites?skiptoken=abc",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits next_cursor on the last page", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ value: [{ id: "s" }] })) as typeof globalThis.fetch;

    const { data } = await findSitesDefinition.run(
      { search: "x" },
      { fetch: fakeFetch },
    );

    expect(data.next_cursor).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("fetches an opaque cursor (nextLink) verbatim, not the base URL", async () => {
    const calls: Array<{ url: string }> = [];
    const cursor =
      "https://graph.microsoft.com/v1.0/sites?search=x&%24skiptoken=OPAQUE";
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findSitesDefinition.run(
      { search: "x", cursor },
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

    const err = await findSitesDefinition
      .run({ search: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
