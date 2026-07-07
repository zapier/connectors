import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createListDefinition from "../scripts/createList.ts";

const { outputSchema } = createListDefinition;

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

describe("createList: run", () => {
  it("POSTs to the site's lists and nests template under list.template (default genericList)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "list-9",
        displayName: "Project Tracker",
        list: { template: "genericList" },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createListDefinition.run(
      { siteId: "site-123", displayName: "Project Tracker" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-123/lists",
    );
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.displayName).toBe("Project Tracker");
    // Template must nest under the `list` facet, defaulting to genericList.
    expect(body.list).toEqual({ template: "genericList" });
    expect(body.template).toBeUndefined();

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("passes an explicit template through under list.template", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "list-9", displayName: "Docs" });
    }) as typeof globalThis.fetch;

    await createListDefinition.run(
      {
        siteId: "site-123",
        displayName: "Docs",
        description: "A library",
        template: "documentLibrary",
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.list).toEqual({ template: "documentLibrary" });
    expect(body.description).toBe("A library");
  });

  it("throws a ConnectorHttpError carrying the status on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createListDefinition
      .run({ siteId: "site-123", displayName: "Nope" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
