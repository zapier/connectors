import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listVideoAgentSessionsDefinition from "../scripts/listVideoAgentSessions.ts";

const { inputSchema, outputSchema } = listVideoAgentSessionsDefinition;

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

describe("listVideoAgentSessions: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a limit + token", () => {
    expect(
      inputSchema.safeParse({ limit: 50, token: "cursor_abc" }).success,
    ).toBe(true);
  });

  it("rejects a limit below 1", () => {
    expect(inputSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe("listVideoAgentSessions: governance", () => {
  it("is read-only", () => {
    expect(listVideoAgentSessionsDefinition.annotations?.readOnlyHint).toBe(
      true,
    );
  });
});

describe("listVideoAgentSessions: run", () => {
  it("GETs /v3/video-agents with the default limit and maps the list envelope to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [
          {
            session_id: "sess_abc123",
            status: "completed",
            created_at: 1_700_000_000,
          },
        ],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listVideoAgentSessionsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const requested = new URL(calls[0]?.url as string);
    expect(requested.origin + requested.pathname).toBe(
      "https://api.heygen.com/v3/video-agents",
    );
    expect(requested.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.session_id).toBe("sess_abc123");
    expect(result.has_more).toBe(false);
  });

  it("forwards the token cursor as a query param", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ data: [], has_more: false, next_token: null });
    }) as typeof globalThis.fetch;

    await listVideoAgentSessionsDefinition.run(
      { token: "cursor_abc" },
      { fetch: fakeFetch },
    );

    const requested = new URL(calls[0]?.url as string);
    expect(requested.searchParams.get("token")).toBe("cursor_abc");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "bad token" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listVideoAgentSessionsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
