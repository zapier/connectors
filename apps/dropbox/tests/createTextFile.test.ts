import { describe, expect, it } from "vitest";

import createTextFileDefinition from "../scripts/createTextFile.ts";

const { inputSchema, outputSchema } = createTextFileDefinition;

function jsonResponse(
  body: unknown,
  init: {
    status?: number;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(
      init.headers ?? { "content-type": "application/json" },
    ),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("createTextFile: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(createTextFileDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createTextFileDefinition.annotations?.destructiveHint).toBe(false);
  });

  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({ path: "/Notes/todo.txt", content: "hello" })
        .success,
    ).toBe(true);
  });
});

describe("createTextFile: run", () => {
  it("uploads to the content host and maps the FileMetadata", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ".tag": "file",
        id: "id:1",
        name: "todo.txt",
        rev: "r1",
        size: 5,
      });
    }) as typeof globalThis.fetch;

    const result = await createTextFileDefinition.run(
      createTextFileDefinition.inputSchema.parse({
        path: "/Notes/todo.txt",
        content: "hello",
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://content.dropboxapi.com/2/files/upload");
    // mapEntry surfaces the .tag as `type` and drops the raw discriminator.
    expect(result.type).toBe("file");
    expect(result.name).toBe("todo.txt");
    expect(Object.prototype.hasOwnProperty.call(result, ".tag")).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sends raw text in the body and the default add mode in the Dropbox-API-Arg header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ ".tag": "file", id: "id:1", name: "todo.txt" });
    }) as typeof globalThis.fetch;

    await createTextFileDefinition.run(
      createTextFileDefinition.inputSchema.parse({
        path: "/Notes/todo.txt",
        content: "hello",
      }),
      { fetch: fakeFetch },
    );

    // Raw text goes in the body, not JSON.
    expect(calls[0]?.init?.body).toBe("hello");

    const headers = calls[0]?.init?.headers as Record<string, string>;
    const apiArg = JSON.parse(headers["Dropbox-API-Arg"]) as Record<
      string,
      unknown
    >;
    expect(apiArg.path).toBe("/Notes/todo.txt");
    expect(apiArg.mode).toEqual({ ".tag": "add" });
  });

  it("throws a tagged error on a path/conflict response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/conflict/file/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      createTextFileDefinition.run(
        createTextFileDefinition.inputSchema.parse({
          path: "/Notes/todo.txt",
          content: "hello",
        }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox createTextFile/);
  });
});
