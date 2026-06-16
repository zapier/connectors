import { describe, expect, it } from "vitest";

import createSharedLinkDefinition from "../scripts/createSharedLink.ts";

const { inputSchema, outputSchema } = createSharedLinkDefinition;

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

describe("createSharedLink: governance", () => {
  it("is a write, not read-only", () => {
    expect(createSharedLinkDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createSharedLinkDefinition.annotations?.idempotentHint).toBe(true);
  });

  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ path: "/f.txt" }).success).toBe(true);
  });
});

describe("createSharedLink: run", () => {
  it("renames .tag to type and adds the url_download variant on success", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        ".tag": "file",
        url: "https://www.dropbox.com/s/a/f.txt?dl=0",
        name: "f.txt",
        path_lower: "/f.txt",
      })) as typeof globalThis.fetch;

    const { data: result } = await createSharedLinkDefinition.run(
      { path: "/f.txt" },
      { fetch: fakeFetch },
    );

    expect(result.type).toBe("file");
    expect(result.url_download).toBe("https://www.dropbox.com/s/a/f.txt?dl=1");
    expect(Object.prototype.hasOwnProperty.call(result, ".tag")).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("wraps requested_visibility as a Stone union in the request body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        ".tag": "file",
        url: "https://www.dropbox.com/s/a/f.txt?dl=0",
      });
    }) as typeof globalThis.fetch;

    await createSharedLinkDefinition.run(
      { path: "/f.txt", requested_visibility: "public" },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      settings: { requested_visibility: unknown };
    };
    expect(body.settings.requested_visibility).toEqual({ ".tag": "public" });
  });

  it("soft-succeeds when the link already exists by listing the existing link", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("create_shared_link_with_settings")) {
        return jsonResponse(
          { error_summary: "shared_link_already_exists/.." },
          { status: 409 },
        );
      }
      // Second call: list_shared_links returns the existing link.
      return jsonResponse({
        links: [
          { ".tag": "file", url: "https://www.dropbox.com/s/a/f.txt?dl=0" },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createSharedLinkDefinition.run(
      { path: "/f.txt" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("create_shared_link_with_settings");
    expect(calls[1]).toContain("list_shared_links");
    expect(result.type).toBe("file");
    expect(result.url_download).toBe("https://www.dropbox.com/s/a/f.txt?dl=1");
  });

  it("rethrows a non-already-exists error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/.." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      createSharedLinkDefinition.run({ path: "/f.txt" }, { fetch: fakeFetch }),
    ).rejects.toThrow(/Dropbox createSharedLink/);
  });
});
