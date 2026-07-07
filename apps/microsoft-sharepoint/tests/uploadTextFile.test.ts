import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import uploadTextFileDefinition from "../scripts/uploadTextFile.ts";

const { outputSchema } = uploadTextFileDefinition;

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

const fileBody = {
  id: "01FILE",
  name: "notes.txt",
  size: 5,
  file: { mimeType: "text/plain" },
};

describe("uploadTextFile: run", () => {
  it("PUTs a raw text body with text/plain to the :/name:/content path and a conflictBehavior query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fileBody);
    }) as typeof globalThis.fetch;

    const { data } = await uploadTextFileDefinition.run(
      { siteId: "site-1", fileName: "notes.txt", content: "hello" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe(
      "/v1.0/sites/site-1/drive/root:/notes.txt:/content",
    );
    expect(url.searchParams.get("@microsoft.graph.conflictBehavior")).toBe(
      "rename",
    );

    expect(calls[0]?.init?.method).toBe("PUT");
    // Raw string body, NOT JSON-stringified.
    expect(calls[0]?.init?.body).toBe("hello");

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("text/plain");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.name).toBe("notes.txt");
  });

  it("targets an explicit driveId + parentItemId colon-path and passes conflictBehavior through", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(fileBody);
    }) as typeof globalThis.fetch;

    await uploadTextFileDefinition.run(
      {
        siteId: "site-1",
        driveId: "drive-9",
        parentItemId: "01PARENT",
        fileName: "notes.txt",
        content: "x",
        conflictBehavior: "replace",
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe(
      "/v1.0/sites/site-1/drives/drive-9/items/01PARENT:/notes.txt:/content",
    );
    expect(url.searchParams.get("@microsoft.graph.conflictBehavior")).toBe(
      "replace",
    );
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await uploadTextFileDefinition
      .run(
        { siteId: "s", fileName: "a.txt", content: "y" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
