import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import exportFileDefinition from "../scripts/exportFile.ts";

const { outputSchema, inputSchema } = exportFileDefinition;

function redirectResponse(location: string): Response {
  return {
    ok: false,
    status: 302,
    statusText: "Found",
    url: "",
    headers: new Headers({ Location: location }),
    text: async () => "",
    json: async () => {
      throw new Error("302 has no JSON body");
    },
  } as unknown as Response;
}

const DOWNLOAD = "https://onedrive-my.example.com/download/preauth?token=xyz";

describe("exportFile: run", () => {
  it("GETs /content?format= with redirect:manual and returns the Location as downloadUrl", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return redirectResponse(DOWNLOAD);
    }) as typeof globalThis.fetch;

    const { data } = await exportFileDefinition.run(
      { itemId: "01FILE", format: "pdf" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1.0/me/drive/items/01FILE/content");
    expect(url.searchParams.get("format")).toBe("pdf");
    expect(calls[0]?.init?.redirect).toBe("manual");

    expect(data.downloadUrl).toBe(DOWNLOAD);
    expect(data.format).toBe("pdf");
    expect(data.id).toBe("01FILE");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId path and passes jpg dimensions", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return redirectResponse(DOWNLOAD);
    }) as typeof globalThis.fetch;

    await exportFileDefinition.run(
      {
        driveId: "drive-9",
        itemId: "01FILE",
        format: "jpg",
        height: 200,
        width: 300,
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!);
    expect(url.pathname).toBe("/v1.0/drives/drive-9/items/01FILE/content");
    expect(url.searchParams.get("format")).toBe("jpg");
    expect(url.searchParams.get("height")).toBe("200");
    expect(url.searchParams.get("width")).toBe("300");
  });

  it("falls back to res.url when the runtime already followed the redirect (2xx, no Location)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        statusText: "OK",
        url: DOWNLOAD,
        headers: new Headers(),
        text: async () => "",
        json: async () => ({}),
      }) as unknown as Response) as typeof globalThis.fetch;

    const { data } = await exportFileDefinition.run(
      { itemId: "01FILE", format: "pdf" },
      { fetch: fakeFetch },
    );

    expect(data.downloadUrl).toBe(DOWNLOAD);
  });

  it("throws a ConnectorHttpError when the source cannot be converted (404, no Location)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 404,
        statusText: "Not Found",
        url: "",
        headers: new Headers({ "content-type": "application/json" }),
        text: async () =>
          JSON.stringify({ error: { code: "itemNotFound", message: "gone" } }),
        json: async () => ({
          error: { code: "itemNotFound", message: "gone" },
        }),
      }) as unknown as Response) as typeof globalThis.fetch;

    const err = await exportFileDefinition
      .run({ itemId: "01FILE", format: "pdf" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });

  it("rejects a jpg export missing height/width at the input schema", () => {
    const result = inputSchema.safeParse({ itemId: "01FILE", format: "jpg" });
    expect(result.success).toBe(false);
  });
});
