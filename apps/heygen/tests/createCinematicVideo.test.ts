import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCinematicVideoDefinition from "../scripts/createCinematicVideo.ts";

const { inputSchema, outputSchema } = createCinematicVideoDefinition;

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

describe("createCinematicVideo: inputSchema", () => {
  it("accepts a prompt with a single avatar look", () => {
    expect(
      inputSchema.safeParse({
        prompt: "A calm narrator introduces the product",
        avatar_id: ["look_123"],
      }).success,
    ).toBe(true);
  });

  it("requires prompt", () => {
    expect(inputSchema.safeParse({ avatar_id: ["look_123"] }).success).toBe(
      false,
    );
  });

  it("requires avatar_id", () => {
    expect(inputSchema.safeParse({ prompt: "hello" }).success).toBe(false);
  });

  it("accepts an avatar_id array of 1-3 looks", () => {
    expect(
      inputSchema.safeParse({
        prompt: "hi",
        avatar_id: ["a", "b", "c"],
      }).success,
    ).toBe(true);
  });

  it("rejects an avatar_id array of 4 looks", () => {
    expect(
      inputSchema.safeParse({
        prompt: "hi",
        avatar_id: ["a", "b", "c", "d"],
      }).success,
    ).toBe(false);
  });
});

describe("createCinematicVideo: governance", () => {
  it("is a non-read-only, non-destructive create", () => {
    expect(createCinematicVideoDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
    expect(createCinematicVideoDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("createCinematicVideo: run", () => {
  it("POSTs to /v3/videos with type=cinematic_avatar and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { video_id: "v_abc123", status: "waiting", output_format: "mp4" },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createCinematicVideoDefinition.run(
      { prompt: "A calm narrator", avatar_id: ["look_123"] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/videos");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      type: "cinematic_avatar",
      prompt: "A calm narrator",
      avatar_id: ["look_123"],
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.video_id).toBe("v_abc123");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "insufficient_credit", message: "no credits" } },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await createCinematicVideoDefinition
      .run(
        { prompt: "A calm narrator", avatar_id: ["look_123"] },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(402);
  });
});
