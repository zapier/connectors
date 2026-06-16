import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import uploadFileDefinition from "../scripts/uploadFile.ts";

const { inputSchema, outputSchema } = uploadFileDefinition;

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

const SRC = "https://example.com/report.pdf";
const CREATE_URL = "https://api.notion.com/v1/file_uploads";
const SEND_URL = "https://api.notion.com/v1/file_uploads/fu-1/send";

describe("uploadFile: inputSchema", () => {
  it("requires a valid file_url", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ file_url: "not-a-url" }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ file_url: SRC }).success).toBe(true);
  });
});

describe("uploadFile: governance", () => {
  it("is a write (not read-only)", () => {
    expect(uploadFileDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("uploadFile: run", () => {
  it("fetches the source, creates a file_upload, sends the bytes, and returns the upload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url === SRC) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          blob: async () => new Blob(["filedata"], { type: "application/pdf" }),
        } as unknown as Response;
      }
      if (url === CREATE_URL) {
        return jsonResponse({ id: "fu-1", upload_url: SEND_URL });
      }
      return jsonResponse({
        id: "fu-1",
        object: "file_upload",
        status: "uploaded",
        filename: "report.pdf",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await uploadFileDefinition.run(
      { file_url: SRC },
      { fetch: fakeFetch },
    );

    const urls = calls.map((c) => c.url);
    expect(urls).toEqual([SRC, CREATE_URL, SEND_URL]);
    // The create call carries the Notion-Version header (via notionFetch).
    const createCall = calls.find((c) => c.url === CREATE_URL);
    expect((createCall?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    // The send call posts multipart form-data with the Notion-Version header.
    const sendCall = calls.find((c) => c.url === SEND_URL);
    expect(sendCall?.init?.method).toBe("POST");
    expect(sendCall?.init?.body).toBeInstanceOf(FormData);
    expect(
      (sendCall?.init?.headers as Record<string, string>)["Notion-Version"],
    ).toBe("2025-09-03");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("fu-1");
    expect(result.status).toBe("uploaded");
  });

  it("throws when the source URL can't be fetched", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }) as unknown as Response) as typeof globalThis.fetch;

    await expect(
      uploadFileDefinition.run({ file_url: SRC }, { fetch: fakeFetch }),
    ).rejects.toThrow(/failed to fetch file_url/i);
  });

  it("throws a ConnectorHttpError when the file_upload create fails", async () => {
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      if (url === SRC) {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(["x"]),
        } as unknown as Response;
      }
      return jsonResponse(
        { object: "error", code: "validation_error", message: "too large" },
        { status: 400 },
      );
    }) as typeof globalThis.fetch;

    const err = await uploadFileDefinition
      .run({ file_url: SRC }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
