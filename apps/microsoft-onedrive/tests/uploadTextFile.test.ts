import { describe, expect, it } from "vitest";

import uploadTextFileDefinition from "../scripts/uploadTextFile.ts";

const { outputSchema } = uploadTextFileDefinition;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const FILE = { id: "01TEXTFILE", name: "notes.txt", file: {} };

describe("uploadTextFile: run", () => {
  it("PUTs raw text to the own-drive root path with text/plain and a rename default", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(FILE);
    }) as typeof globalThis.fetch;

    const { data } = await uploadTextFileDefinition.run(
      { fileName: "notes.txt", content: "hello world" },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v1.0/me/drive/root:/notes.txt:/content");
    expect(url.searchParams.get("@microsoft.graph.conflictBehavior")).toBe(
      "rename",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(new Headers(calls[0]?.init?.headers).get("content-type")).toBe(
      "text/plain",
    );
    expect(calls[0]?.init?.body).toBe("hello world");
    expect(data.id).toBe("01TEXTFILE");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit drive + parent folder", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(FILE);
    }) as typeof globalThis.fetch;

    await uploadTextFileDefinition.run(
      {
        driveId: "drive-9",
        parentItemId: "01PARENT",
        fileName: "notes.txt",
        content: "x",
      },
      { fetch: fakeFetch },
    );

    expect(new URL(calls[0]!).pathname).toBe(
      "/v1.0/drives/drive-9/items/01PARENT:/notes.txt:/content",
    );
  });
});
