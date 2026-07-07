import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import inviteToItemDefinition from "../scripts/inviteToItem.ts";

const { outputSchema } = inviteToItemDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const PERMISSIONS = [
  { id: "perm-a", roles: ["read"] },
  { id: "perm-b", roles: ["write"] },
];

describe("inviteToItem: run", () => {
  it("POSTs invite against the default library and unwraps { value } to { items }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ value: PERMISSIONS });
    }) as typeof globalThis.fetch;

    const { data } = await inviteToItemDefinition.run(
      {
        siteId: "site-123",
        itemId: "01FILEITEM",
        recipients: [{ email: "a@example.com" }, { email: "b@example.com" }],
        roles: ["read"],
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drive/items/01FILEITEM/invite`,
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      recipients: [{ email: "a@example.com" }, { email: "b@example.com" }],
      roles: ["read"],
      requireSignIn: true,
      sendInvitation: true,
    });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(2);
    expect(data.items[0]?.id).toBe("perm-a");
  });

  it("targets an explicit drive when driveId is set", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ value: PERMISSIONS });
    }) as typeof globalThis.fetch;

    await inviteToItemDefinition.run(
      {
        siteId: "site-123",
        driveId: "drive-9",
        itemId: "01FILEITEM",
        recipients: [{ email: "a@example.com" }],
        roles: ["write"],
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `${GRAPH}/sites/site-123/drives/drive-9/items/01FILEITEM/invite`,
    );
  });

  it("treats a 207 Multi-Status as a soft success: returns items, does NOT throw", async () => {
    // A non-ok 207 exercises the `res.status !== 207` guard: it must skip the
    // error path and still surface the per-recipient permission results.
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { value: PERMISSIONS },
        {
          status: 207,
          ok: false,
        },
      )) as typeof globalThis.fetch;

    const { data } = await inviteToItemDefinition.run(
      {
        siteId: "site-123",
        itemId: "01FILEITEM",
        recipients: [{ email: "a@example.com" }],
        roles: ["read"],
      },
      { fetch: fakeFetch },
    );

    expect(data.items).toHaveLength(2);
  });

  it("routes a non-207 error through the SDK error path (ConnectorHttpError)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await inviteToItemDefinition
      .run(
        {
          siteId: "site-123",
          itemId: "01FILEITEM",
          recipients: [{ email: "a@example.com" }],
          roles: ["read"],
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
