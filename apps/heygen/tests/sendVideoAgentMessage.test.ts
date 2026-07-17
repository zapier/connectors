import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import sendVideoAgentMessageDefinition from "../scripts/sendVideoAgentMessage.ts";

const { inputSchema, outputSchema } = sendVideoAgentMessageDefinition;

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

describe("sendVideoAgentMessage: inputSchema", () => {
  it("accepts a session_id + message", () => {
    expect(
      inputSchema.safeParse({
        session_id: "sess_abc123",
        message: "Make it shorter",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing message", () => {
    expect(inputSchema.safeParse({ session_id: "sess_abc123" }).success).toBe(
      false,
    );
  });

  it("rejects a missing session_id", () => {
    expect(inputSchema.safeParse({ message: "hi" }).success).toBe(false);
  });
});

describe("sendVideoAgentMessage: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(sendVideoAgentMessageDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
    expect(sendVideoAgentMessageDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("sendVideoAgentMessage: run", () => {
  it("POSTs to /v3/video-agents/{session_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          session_id: "sess_abc123",
          run_id: "run_xyz789",
          title: "Widgets Explainer",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await sendVideoAgentMessageDefinition.run(
      { session_id: "sess_abc123", message: "Make it shorter" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/video-agents/sess_abc123",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      message: "Make it shorter",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.run_id).toBe("run_xyz789");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "conflict", message: "session not in chat mode" } },
        { status: 409 },
      )) as typeof globalThis.fetch;

    const err = await sendVideoAgentMessageDefinition
      .run({ session_id: "sess_abc123", message: "hi" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(409);
  });
});
