import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import replaceFileDefinition from "../scripts/replaceFile.ts";

const { outputSchema } = replaceFileDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";
const SOURCE_URL = "https://files.example.com/source/v2.bin";
const UPLOAD_URL = "https://upload.sharepoint.example.com/session/def456";

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

function bytesResponse(
  bytes: Uint8Array,
  init: { status?: number } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  const copy = bytes.slice();
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    arrayBuffer: async () => copy.buffer,
    text: async () => "",
    json: async () => ({}),
  } as unknown as Response;
}

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function makeFetch(
  calls: Recorded[],
  bytes: Uint8Array,
  opts: { sessionStatus?: number } = {},
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const method = init?.method ?? "GET";
    if (method === "PUT") {
      return jsonResponse(
        {
          id: "01EXISTINGITEM",
          name: "v2.bin",
          size: bytes.byteLength,
          file: { mimeType: "application/octet-stream" },
        },
        { status: 201 },
      );
    }
    if (url.endsWith("/createUploadSession")) {
      const status = opts.sessionStatus ?? 200;
      if (status >= 200 && status < 300) {
        return jsonResponse({ uploadUrl: UPLOAD_URL });
      }
      return jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status },
      );
    }
    return bytesResponse(bytes);
  }) as typeof globalThis.fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("replaceFile: run", () => {
  it("opens a session against the existing item id (keeping the id) and PUTs the new bytes with no Authorization header", async () => {
    const bytes = new Uint8Array([7, 7, 7, 7]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const { data } = await replaceFileDefinition.run(
      { siteId: "site-123", itemId: "01EXISTINGITEM", fileUrl: SOURCE_URL },
      { fetch: router },
    );

    expect(calls[0]?.url).toBe(SOURCE_URL);

    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    // Default library + `/items/{id}/createUploadSession` (not `:/name:`).
    expect(session?.url).toBe(
      `${GRAPH}/sites/site-123/drive/items/01EXISTINGITEM/createUploadSession`,
    );
    expect(session?.init?.method).toBe("POST");
    // replaceFile always finalizes with conflictBehavior "replace".
    expect(JSON.parse(session?.init?.body as string)).toEqual({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    });

    const put = calls.find((c) => (c.init?.method ?? "GET") === "PUT");
    expect(put?.url).toBe(UPLOAD_URL);
    expect(new Headers(put?.init?.headers).get("authorization")).toBeNull();

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("01EXISTINGITEM");
  });

  it("targets an explicit drive when driveId is set", async () => {
    const bytes = new Uint8Array([1]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    await replaceFileDefinition.run(
      {
        siteId: "site-123",
        driveId: "drive-9",
        itemId: "01EXISTINGITEM",
        fileUrl: SOURCE_URL,
      },
      { fetch: router },
    );

    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    expect(session?.url).toBe(
      `${GRAPH}/sites/site-123/drives/drive-9/items/01EXISTINGITEM/createUploadSession`,
    );
  });

  it("throws a ConnectorHttpError when createUploadSession fails", async () => {
    const bytes = new Uint8Array([1, 2]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes, { sessionStatus: 404 });
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const err = await replaceFileDefinition
      .run(
        { siteId: "site-123", itemId: "01EXISTINGITEM", fileUrl: SOURCE_URL },
        { fetch: router },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
