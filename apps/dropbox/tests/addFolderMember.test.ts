import { describe, expect, it } from "vitest";

import addFolderMemberDefinition from "../scripts/addFolderMember.ts";

const { inputSchema, outputSchema } = addFolderMemberDefinition;

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

describe("addFolderMember: governance", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        shared_folder_id: "sf1",
        members: ["a@x.com"], // pii:allow
        access_level: "editor",
      }).success,
    ).toBe(true);
  });

  it("is not flagged read-only", () => {
    expect(addFolderMemberDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("addFolderMember: run", () => {
  it("echoes the shared_folder_id and added members on an empty-body success", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({})) as typeof globalThis.fetch;

    const { data: result } = await addFolderMemberDefinition.run(
      {
        shared_folder_id: "sf1",
        members: ["a@x.com", "b@x.com"], // pii:allow
        access_level: "editor",
      },
      { fetch: fakeFetch },
    );

    expect(result).toEqual({
      shared_folder_id: "sf1",
      members_added: ["a@x.com", "b@x.com"], // pii:allow
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("wraps each member into a Stone email union with a tagged access_level", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({});
    }) as typeof globalThis.fetch;

    await addFolderMemberDefinition.run(
      {
        shared_folder_id: "sf1",
        members: ["a@x.com", "b@x.com"], // pii:allow
        access_level: "editor",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/sharing/add_folder_member",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.members).toEqual([
      {
        member: { ".tag": "email", email: "a@x.com" }, // pii:allow
        access_level: { ".tag": "editor" },
      },
      {
        member: { ".tag": "email", email: "b@x.com" }, // pii:allow
        access_level: { ".tag": "editor" },
      },
    ]);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "bad_member/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      addFolderMemberDefinition.run(
        {
          shared_folder_id: "sf1",
          members: ["a@x.com"], // pii:allow
          access_level: "editor",
        },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox addFolderMember/);
  });
});
