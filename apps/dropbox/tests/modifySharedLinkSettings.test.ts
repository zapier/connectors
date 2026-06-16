import { describe, expect, it } from "vitest";

import modifySharedLinkSettingsDefinition from "../scripts/modifySharedLinkSettings.ts";

const { inputSchema, outputSchema } = modifySharedLinkSettingsDefinition;

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

describe("modifySharedLinkSettings: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ url: "https://x/f?dl=0" }).success).toBe(
      true,
    );
  });

  it("rejects passing both expires and remove_expiration", () => {
    expect(
      inputSchema.safeParse({
        url: "https://x",
        expires: "2026-01-01T00:00:00Z",
        remove_expiration: true,
      }).success,
    ).toBe(false);
  });
});

describe("modifySharedLinkSettings: run", () => {
  it("renames .tag to type and adds the url_download variant on success", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        ".tag": "file",
        url: "https://x/f?dl=0",
      })) as typeof globalThis.fetch;

    const { data: result } = await modifySharedLinkSettingsDefinition.run(
      { url: "https://x/f?dl=0" },
      { fetch: fakeFetch },
    );

    expect(result.type).toBe("file");
    expect(result.url_download).toBe("https://x/f?dl=1");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("wraps enums in settings and keeps remove_expiration top-level", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ ".tag": "file", url: "https://x/f?dl=0" });
    }) as typeof globalThis.fetch;

    await modifySharedLinkSettingsDefinition.run(
      {
        url: "https://x/f?dl=0",
        requested_visibility: "password",
        link_password: "pw",
        remove_expiration: true,
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      settings: { requested_visibility: unknown; link_password: unknown };
      remove_expiration?: unknown;
    };
    expect(body.settings.requested_visibility).toEqual({ ".tag": "password" });
    expect(body.settings.link_password).toBe("pw");
    // remove_expiration is a TOP-LEVEL wire flag, never inside settings.
    expect(body.remove_expiration).toBe(true);
    expect("remove_expiration" in body.settings).toBe(false);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "settings_error/.." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      modifySharedLinkSettingsDefinition.run(
        { url: "https://x/f?dl=0" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox modifySharedLinkSettings/);
  });
});
