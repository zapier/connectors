import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getVideoAgentSessionDefinition from "../scripts/getVideoAgentSession.ts";

const { inputSchema, outputSchema } = getVideoAgentSessionDefinition;

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

describe("getVideoAgentSession: inputSchema", () => {
  it("accepts a session_id", () => {
    expect(inputSchema.safeParse({ session_id: "sess_abc123" }).success).toBe(
      true,
    );
  });

  it("rejects a missing session_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getVideoAgentSession: governance", () => {
  it("is read-only", () => {
    expect(getVideoAgentSessionDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getVideoAgentSession: run", () => {
  it("GETs /v3/video-agents/{session_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          session_id: "sess_abc123",
          status: "completed",
          progress: 100,
          title: "Widgets Explainer",
          video_id: "v_final",
          created_at: 1_700_000_000,
          messages: [{ role: "user", text: "make it shorter" }],
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getVideoAgentSessionDefinition.run(
      { session_id: "sess_abc123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/video-agents/sess_abc123",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.session_id).toBe("sess_abc123");
    expect(result.video_id).toBe("v_final");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such session" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getVideoAgentSessionDefinition
      .run({ session_id: "sess_missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
