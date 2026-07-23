import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listWorkspaceUsersDefinition from "../scripts/listWorkspaceUsers.ts";

const { inputSchema, outputSchema } = listWorkspaceUsersDefinition;

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

// Clay returns the user id as a number; the connector coerces it to a string.
const BODY = {
  users: [{ id: 714296, name: "Ada", email: "ada@example.com" }],
};

describe("listWorkspaceUsers: inputSchema", () => {
  it("requires workspaceId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ workspaceId: "w_1" }).success).toBe(true);
  });
});

describe("listWorkspaceUsers: governance", () => {
  it("is read-only", () => {
    expect(listWorkspaceUsersDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listWorkspaceUsers: run", () => {
  it("GETs the workspace users path and returns the list", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BODY);
    }) as typeof globalThis.fetch;

    const { data: result } = await listWorkspaceUsersDefinition.run(
      { workspaceId: "w_1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.clay.com/v3/workspaces/w_1/users");
    expect(outputSchema.safeParse(result).success).toBe(true);
    // Numeric id from the API is coerced to a string.
    expect(result.users?.[0]?.id).toBe("714296");
    expect(result.users?.[0]?.email).toBe("ada@example.com");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "nope" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listWorkspaceUsersDefinition
      .run({ workspaceId: "w_1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
