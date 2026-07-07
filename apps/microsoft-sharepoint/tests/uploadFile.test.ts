import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import uploadFileDefinition from "../scripts/uploadFile.ts";

const { outputSchema } = uploadFileDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";
const SOURCE_URL = "https://files.example.com/source/report.pdf";
const UPLOAD_URL = "https://upload.sharepoint.example.com/session/abc123";

/** A JSON-bearing fake Response (Graph session POST / chunk PUT). */
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

/** A byte-bearing fake Response for the unauthenticated source download. */
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

/**
 * One router that plays the role of BOTH `globalThis.fetch` (source download +
 * chunk PUT) and `ctx.fetch` (createUploadSession POST), so every call is
 * captured in `calls`. `sessionStatus` lets the error test fail the POST.
 */
function makeFetch(
  calls: Recorded[],
  bytes: Uint8Array,
  opts: { sessionStatus?: number } = {},
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const method = init?.method ?? "GET";
    if (method === "PUT") {
      // The finalized driveItem rides on the last chunk's 201.
      return jsonResponse(
        {
          id: "01UPLOADEDITEM",
          name: "report.pdf",
          size: bytes.byteLength,
          file: { mimeType: "application/pdf" },
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
        { error: { code: "accessDenied", message: "no consent" } },
        { status },
      );
    }
    // Anything else is the unauthenticated source download.
    return bytesResponse(bytes);
  }) as typeof globalThis.fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadFile: run", () => {
  it("downloads the source, opens a session against the default library, PUTs the bytes with no Authorization header, and returns the driveItem", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const { data } = await uploadFileDefinition.run(
      {
        siteId: "site-123",
        fileName: "report.pdf",
        fileUrl: SOURCE_URL,
      },
      { fetch: router },
    );

    // 1. Source download (GET, unauthenticated).
    expect(calls[0]?.url).toBe(SOURCE_URL);
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    // 2. createUploadSession — default-library path + `:/name:/createUploadSession`.
    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    expect(session?.url).toBe(
      `${GRAPH}/sites/site-123/drive/root:/report.pdf:/createUploadSession`,
    );
    expect(session?.init?.method).toBe("POST");
    expect(JSON.parse(session?.init?.body as string)).toEqual({
      item: { "@microsoft.graph.conflictBehavior": "rename" },
    });

    // 3. Chunk PUT to the pre-authenticated upload URL — NO Authorization.
    const put = calls.find((c) => (c.init?.method ?? "GET") === "PUT");
    expect(put?.url).toBe(UPLOAD_URL);
    expect(new Headers(put?.init?.headers).get("authorization")).toBeNull();

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("01UPLOADEDITEM");
  });

  it("targets an explicit drive + parent folder when driveId/parentItemId are set", async () => {
    const bytes = new Uint8Array([9, 9, 9]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    await uploadFileDefinition.run(
      {
        siteId: "site-123",
        driveId: "drive-9",
        parentItemId: "folder-7",
        fileName: "report.pdf",
        fileUrl: SOURCE_URL,
        conflictBehavior: "replace",
      },
      { fetch: router },
    );

    const session = calls.find((c) => c.url.endsWith("/createUploadSession"));
    expect(session?.url).toBe(
      `${GRAPH}/sites/site-123/drives/drive-9/items/folder-7:/report.pdf:/createUploadSession`,
    );
    expect(JSON.parse(session?.init?.body as string)).toEqual({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    });
  });

  it("throws a ConnectorHttpError when createUploadSession fails", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes, { sessionStatus: 403 });
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const err = await uploadFileDefinition
      .run(
        { siteId: "site-123", fileName: "report.pdf", fileUrl: SOURCE_URL },
        { fetch: router },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });

  it("uploads a 0-byte source via a simple PUT to /content, bypassing the upload session", async () => {
    const bytes = new Uint8Array([]); // empty source
    const calls: Recorded[] = [];
    const router = makeFetch(calls, bytes);
    vi.spyOn(globalThis, "fetch").mockImplementation(router);

    const { data } = await uploadFileDefinition.run(
      { siteId: "site-123", fileName: "empty.txt", fileUrl: SOURCE_URL },
      { fetch: router },
    );

    // No upload session is opened for an empty file.
    expect(calls.some((c) => c.url.endsWith("/createUploadSession"))).toBe(
      false,
    );

    // The bytes go via a simple PUT to the item's /content, with an empty body.
    const put = calls.find((c) => (c.init?.method ?? "GET") === "PUT");
    expect(put?.url).toContain(
      `${GRAPH}/sites/site-123/drive/root:/empty.txt:/content`,
    );
    expect(put?.init?.body).toBe("");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("01UPLOADEDITEM");
  });
});
