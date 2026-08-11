import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getFile from "../scripts/getFile.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...init.headers,
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("getFile: run", () => {
  it("GETs the raw endpoint and returns { file_path, ref, content } from the text body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("file contents here", {
        headers: { "content-type": "text/plain" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await getFile.run(
      getFile.inputSchema.parse({
        projectId: "12",
        filePath: "src/app.ts",
        ref: "main",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/repository/files/src%2Fapp.ts/raw",
    );
    expect(calls[0]?.url).toContain("ref=main");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.content).toBe("file contents here");
    expect(data.file_path).toBe("src/app.ts");
    expect(data.ref).toBe("main");
    expect(getFile.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse("x", { headers: { "content-type": "text/plain" } });
    }) as typeof globalThis.fetch;

    await getFile.run(
      getFile.inputSchema.parse({
        projectId: "group/project",
        filePath: "a.ts",
        ref: "main",
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain(
      "/projects/group%2Fproject/repository/files/a.ts/raw",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 File Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getFile
      .run(
        getFile.inputSchema.parse({
          projectId: "12",
          filePath: "missing.ts",
          ref: "main",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
