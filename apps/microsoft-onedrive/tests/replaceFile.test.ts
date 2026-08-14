import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import replaceFileDefinition from "../scripts/replaceFile.ts";

const { outputSchema } = replaceFileDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";
const SOURCE_URL = "https://files.example.com/source/report.pdf";
const UPLOAD_URL = "https://upload.onedrive.example.com/session/abc123";

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

function bytesResponse(bytes: Uint8Array): Response {
  const copy = bytes.slice();
  return {
    ok: true,
    status: 200,
    statusText: "OK",
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
        { id: "01EXISTINGITEM", name: "report.pdf", size: bytes.byteLength },
        { status: 200 },
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
  it("opens a session against the existing item (replace) and keeps its id", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const { data } = await replaceFileDefinition.run(
      { itemId: "01EXISTINGITEM", fileUrl: SOURCE_URL },
      { fetch: router },
    );

    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    expect(session?.url).toBe(
      `${GRAPH}/me/drive/items/01EXISTINGITEM/createUploadSession`,
    );
    expect(JSON.parse(session?.init?.body as string)).toEqual({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    });

    const put = calls.find((c) => (c.init?.method ?? "GET") === "PUT");
    expect(new Headers(put?.init?.headers).get("authorization")).toBeNull();

    expect(data.id).toBe("01EXISTINGITEM");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId", async () => {
    const bytes = new Uint8Array([5, 6]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    await replaceFileDefinition.run(
      { itemId: "01ITEM", driveId: "drive-9", fileUrl: SOURCE_URL },
      { fetch: router },
    );

    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    expect(session?.url).toBe(
      `${GRAPH}/drives/drive-9/items/01ITEM/createUploadSession`,
    );
  });

  it("throws a ConnectorHttpError when the session cannot be opened", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes, { sessionStatus: 404 });
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const err = await replaceFileDefinition
      .run({ itemId: "bad", fileUrl: SOURCE_URL }, { fetch: router })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
