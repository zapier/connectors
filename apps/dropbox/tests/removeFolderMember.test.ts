import { describe, expect, it } from "vitest";

import removeFolderMemberDefinition from "../scripts/removeFolderMember.ts";

const { outputSchema } = removeFolderMemberDefinition;

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

describe("removeFolderMember: governance", () => {
  it("flags the destructive removal", () => {
    expect(removeFolderMemberDefinition.annotations?.destructiveHint).toBe(
      true,
    );
  });
});

describe("removeFolderMember: run", () => {
  it("returns removed:true on a synchronous complete with only one fetch", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ ".tag": "complete" });
    }) as typeof globalThis.fetch;

    const { data: result } = await removeFolderMemberDefinition.run(
      { shared_folder_id: "sf1", member: "sam@acme.com" },
      { fetch: fakeFetch },
    );

    expect(result).toEqual({
      shared_folder_id: "sf1",
      member: "sam@acme.com",
      removed: true,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/sharing/remove_folder_member",
    );

    // Quirky: the initiate body wraps member into a Stone email union.
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.member).toEqual({ ".tag": "email", email: "sam@acme.com" });
  });

  it("polls check_remove_member_job_status after an async_job_id, then completes", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("/remove_folder_member")) {
        return jsonResponse({ ".tag": "async_job_id", async_job_id: "j1" });
      }
      if (url.includes("/check_remove_member_job_status")) {
        return jsonResponse({ ".tag": "complete" });
      }
      throw new Error(`unexpected url ${url}`);
    }) as typeof globalThis.fetch;

    const { data: result } = await removeFolderMemberDefinition.run(
      { shared_folder_id: "sf1", member: "sam@acme.com" },
      { fetch: fakeFetch },
    );

    expect(result.removed).toBe(true);
    expect(
      calls.some((u) => u.includes("/check_remove_member_job_status")),
    ).toBe(true);
  });

  it("rejects when the polled job reports failed", async () => {
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      if (url.includes("/remove_folder_member")) {
        return jsonResponse({ ".tag": "async_job_id", async_job_id: "j1" });
      }
      return jsonResponse({ ".tag": "failed", failed: "no_such_member" });
    }) as typeof globalThis.fetch;

    await expect(
      removeFolderMemberDefinition.run(
        { shared_folder_id: "sf1", member: "sam@acme.com" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/failed/);
  });
});
