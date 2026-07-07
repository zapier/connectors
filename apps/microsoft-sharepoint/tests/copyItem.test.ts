import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import copyItemDefinition from "../scripts/copyItem.ts";

const { outputSchema } = copyItemDefinition;

/** A 202 accepted response carrying the async monitor URL in Location. */
function acceptedResponse(location: string): Response {
  return {
    ok: true,
    status: 202,
    statusText: "Accepted",
    // Real Headers so run()'s res.headers.get("Location") resolves.
    headers: new Headers({ Location: location }),
    text: async () => "",
    json: async () => {
      throw new Error("202 has no body");
    },
  } as unknown as Response;
}

function errorResponse(body: unknown, status: number): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const MONITOR = "https://graph.microsoft.com/v1.0/monitor/abc123";

describe("copyItem: run", () => {
  it("POSTs to /items/{id}/copy with parentReference + default conflictBehavior and returns the monitor URL", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return acceptedResponse(MONITOR);
    }) as typeof globalThis.fetch;

    const { data } = await copyItemDefinition.run(
      {
        siteId: "site-1",
        itemId: "01SRC",
        targetDriveId: "drive-dest",
        targetParentItemId: "01DEST",
        newName: "copy.docx",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/items/01SRC/copy",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      parentReference: { driveId: "drive-dest", id: "01DEST" },
      name: "copy.docx",
      "@microsoft.graph.conflictBehavior": "rename",
    });

    expect(data).toEqual({ monitorUrl: MONITOR, status: "accepted" });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits parentReference.id and name when not supplied", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return acceptedResponse(MONITOR);
    }) as typeof globalThis.fetch;

    await copyItemDefinition.run(
      { siteId: "s", itemId: "01SRC", targetDriveId: "drive-dest" },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      parentReference: { driveId: "drive-dest" },
      "@microsoft.graph.conflictBehavior": "rename",
    });
  });

  it("throws when the 202 carries no Location header", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 202,
        statusText: "Accepted",
        headers: new Headers(),
        text: async () => "",
        json: async () => ({}),
      }) as unknown as Response) as typeof globalThis.fetch;

    const err = await copyItemDefinition
      .run(
        { siteId: "s", itemId: "01SRC", targetDriveId: "d" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("no Location monitor URL");
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      errorResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        404,
      )) as typeof globalThis.fetch;

    const err = await copyItemDefinition
      .run(
        { siteId: "s", itemId: "01SRC", targetDriveId: "d" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
