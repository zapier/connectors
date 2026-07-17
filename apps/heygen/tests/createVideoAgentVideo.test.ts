import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createVideoAgentVideoDefinition from "../scripts/createVideoAgentVideo.ts";

const { inputSchema, outputSchema } = createVideoAgentVideoDefinition;

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

describe("createVideoAgentVideo: inputSchema", () => {
  it("accepts a minimal prompt", () => {
    expect(
      inputSchema.safeParse({ prompt: "A 30s explainer about widgets" })
        .success,
    ).toBe(true);
  });

  it("accepts optional fields (mode, avatar, voice, orientation)", () => {
    expect(
      inputSchema.safeParse({
        prompt: "A product demo",
        mode: "chat",
        avatar_id: "look_123",
        voice_id: "voice_123",
        orientation: "portrait",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing prompt", () => {
    expect(inputSchema.safeParse({ mode: "generate" }).success).toBe(false);
  });
});

describe("createVideoAgentVideo: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(createVideoAgentVideoDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
    expect(createVideoAgentVideoDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("createVideoAgentVideo: run", () => {
  it("POSTs to /v3/video-agents and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          session_id: "sess_abc123",
          status: "generating",
          video_id: null,
          created_at: 1_700_000_000,
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createVideoAgentVideoDefinition.run(
      { prompt: "A 30s explainer about widgets", mode: "generate" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/video-agents");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      prompt: "A 30s explainer about widgets",
      mode: "generate",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.session_id).toBe("sess_abc123");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "insufficient_credit", message: "no credits" } },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await createVideoAgentVideoDefinition
      .run({ prompt: "hi" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(402);
  });
});
