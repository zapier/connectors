import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listWorkspacesDefinition from "../scripts/listWorkspaces.ts";

const { inputSchema, outputSchema } = listWorkspacesDefinition;

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

const IDENTITY = { auth: { actor: { userId: "u_1" } } };
// The /v3 wire returns rows under `results`, and workspace ids come back
// numeric; the tool maps them to `workspaces` and coerces the id to a string.
const WORKSPACES = { results: [{ id: 629028, name: "Growth" }] };

describe("listWorkspaces: inputSchema", () => {
  it("takes no input (userId is resolved internally)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ userId: "u_1" }).success).toBe(false);
  });
});

describe("listWorkspaces: governance", () => {
  it("is read-only", () => {
    expect(listWorkspacesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listWorkspaces: run", () => {
  it("resolves the caller's userId from the root, then lists their workspaces", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (url === "https://api.clay.com/v3/") return jsonResponse(IDENTITY);
      return jsonResponse(WORKSPACES);
    }) as typeof globalThis.fetch;

    const { data: result } = await listWorkspacesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/");
    expect(calls[1]?.url).toBe("https://api.clay.com/v3/users/u_1/workspaces");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.workspaces?.[0]?.id).toBe("629028");
  });

  it("throws when the identity call cannot resolve a userId", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ auth: {} })) as typeof globalThis.fetch;

    const err = await listWorkspacesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("user id");
  });

  it("throws a ConnectorHttpError when the identity call is non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listWorkspacesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
