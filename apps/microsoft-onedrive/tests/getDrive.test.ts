import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getDriveDefinition from "../scripts/getDrive.ts";

const { outputSchema } = getDriveDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

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

const DRIVE = {
  id: "b!drive-1",
  name: "OneDrive",
  driveType: "personal",
  quota: { total: 100, used: 40, remaining: 60, state: "normal" },
};

describe("getDrive: run", () => {
  it("GETs /me/drive by default and returns the drive", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(DRIVE);
    }) as typeof globalThis.fetch;

    const { data } = await getDriveDefinition.run({}, { fetch: fakeFetch });

    expect(calls[0]).toBe(`${GRAPH}/me/drive`);
    expect(data.id).toBe("b!drive-1");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(DRIVE);
    }) as typeof globalThis.fetch;

    await getDriveDefinition.run({ driveId: "drive-9" }, { fetch: fakeFetch });

    expect(calls[0]).toBe(`${GRAPH}/drives/drive-9`);
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getDriveDefinition
      .run({ driveId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
