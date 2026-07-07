import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createFolderDefinition from "../scripts/createFolder.ts";

const { outputSchema } = createFolderDefinition;

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

const folderBody = {
  id: "01FOLDER",
  name: "Reports",
  folder: { childCount: 0 },
  webUrl: "https://contoso.sharepoint.com/sites/x/Reports",
};

describe("createFolder: run", () => {
  it("POSTs to the default library root and sends folder:{} + default conflictBehavior", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(folderBody);
    }) as typeof globalThis.fetch;

    const { data } = await createFolderDefinition.run(
      { siteId: "site-1", name: "Reports" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/children",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      name: "Reports",
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.name).toBe("Reports");
  });

  it("targets an explicit driveId and nests under parentItemId, honoring an explicit conflictBehavior", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(folderBody);
    }) as typeof globalThis.fetch;

    await createFolderDefinition.run(
      {
        siteId: "site-1",
        driveId: "drive-9",
        parentItemId: "01PARENT",
        name: "Reports",
        conflictBehavior: "fail",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives/drive-9/items/01PARENT/children",
    );
    expect(
      JSON.parse(calls[0]?.init?.body as string)[
        "@microsoft.graph.conflictBehavior"
      ],
    ).toBe("fail");
  });

  it("uses /root/children when parentItemId is omitted and /items/{id}/children when provided", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(folderBody);
    }) as typeof globalThis.fetch;

    await createFolderDefinition.run(
      { siteId: "s", name: "A" },
      { fetch: fakeFetch },
    );
    await createFolderDefinition.run(
      { siteId: "s", parentItemId: "PID", name: "B" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain("/drive/root/children");
    expect(calls[1]).toContain("/drive/items/PID/children");
  });

  it("throws a ConnectorHttpError on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createFolderDefinition
      .run({ siteId: "s", name: "A" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
