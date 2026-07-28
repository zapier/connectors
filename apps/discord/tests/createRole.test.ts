import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createRole.ts";

const { inputSchema, outputSchema } = definition;

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

describe("createRole: run", () => {
  it("POSTs the role and passes color through as an integer", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "99", name: "mod", color: 3447003 });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      guild_id: "g1",
      name: "mod",
      color: 3447003,
    });
    const { data: result } = await definition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://discord.com/api/v10/guilds/g1/roles");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({ name: "mod", color: 3447003 });
    expect(typeof body.color).toBe("number");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("99");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Permissions" },
        { status: 403 },
      )) as never;

    const input = inputSchema.parse({ guild_id: "g1", name: "mod" });
    const err = await definition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
