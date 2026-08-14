import { describe, expect, it } from "vitest";

import createFolderDefinition from "../scripts/createFolder.ts";

const { outputSchema } = createFolderDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

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

const FOLDER = {
  id: "01NEWFOLDER",
  name: "Reports",
  folder: { childCount: 0 },
};

describe("createFolder: run", () => {
  it("POSTs to the own-drive root children with the default rename conflictBehavior", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(FOLDER);
    }) as typeof globalThis.fetch;

    const { data } = await createFolderDefinition.run(
      { name: "Reports" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(`${GRAPH}/me/drive/root/children`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      name: "Reports",
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    });
    expect(data.id).toBe("01NEWFOLDER");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("nests under a parent folder + drive and honors an explicit conflictBehavior", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(FOLDER);
    }) as typeof globalThis.fetch;

    await createFolderDefinition.run(
      {
        driveId: "drive-9",
        parentItemId: "01PARENT",
        name: "Reports",
        conflictBehavior: "fail",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/drives/drive-9/items/01PARENT/children`,
    );
    expect(
      JSON.parse(calls[0]?.init?.body as string)[
        "@microsoft.graph.conflictBehavior"
      ],
    ).toBe("fail");
  });
});
