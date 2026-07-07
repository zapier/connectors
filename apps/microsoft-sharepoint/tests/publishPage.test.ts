import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import publishPageDefinition from "../scripts/publishPage.ts";

const { outputSchema } = publishPageDefinition;

function emptyResponse(status: number): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "No Content" : "Error",
    headers: new Headers(),
    text: async () => "",
    // A 204 has no body; the script must not call .json().
    json: async () => {
      throw new Error("no body");
    },
  } as unknown as Response;
}

function jsonResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("publishPage: run", () => {
  it("POSTs to /pages/{pageId}/microsoft.graph.sitePage/publish and returns success on 204", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return emptyResponse(204);
    }) as typeof globalThis.fetch;

    const { data: result } = await publishPageDefinition.run(
      { siteId: "site123", pageId: "page1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site123/pages/page1/microsoft.graph.sitePage/publish",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(result).toEqual({ success: true });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError carrying the status on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "not found" } },
        404,
      )) as typeof globalThis.fetch;

    const err = await publishPageDefinition
      .run({ siteId: "site123", pageId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
