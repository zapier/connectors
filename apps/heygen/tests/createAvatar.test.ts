import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createAvatarDefinition from "../scripts/createAvatar.ts";

const { inputSchema, outputSchema } = createAvatarDefinition;

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

describe("createAvatar: inputSchema", () => {
  it("accepts a prompt-based avatar", () => {
    expect(
      inputSchema.safeParse({
        type: "prompt",
        name: "My Avatar",
        prompt: "A friendly narrator",
      }).success,
    ).toBe(true);
  });

  it("accepts a photo-based avatar", () => {
    expect(
      inputSchema.safeParse({
        type: "photo",
        image_url: "https://example.com/a.png",
      }).success,
    ).toBe(true);
  });

  it("requires type", () => {
    expect(
      inputSchema.safeParse({ prompt: "A friendly narrator" }).success,
    ).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(inputSchema.safeParse({ type: "hologram" }).success).toBe(false);
  });
});

describe("createAvatar: governance", () => {
  it("is a non-read-only, non-destructive, non-idempotent write", () => {
    expect(createAvatarDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createAvatarDefinition.annotations?.destructiveHint).toBe(false);
    expect(createAvatarDefinition.annotations?.idempotentHint).toBe(false);
  });
});

describe("createAvatar: run", () => {
  it("POSTs to /v3/avatars and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          avatar_item: {
            id: "look_new",
            name: "My Avatar",
            avatar_type: "photo_avatar",
            status: "processing",
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createAvatarDefinition.run(
      { type: "prompt", name: "My Avatar", prompt: "A friendly narrator" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/avatars");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      type: "prompt",
      name: "My Avatar",
      prompt: "A friendly narrator",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.avatar_item?.id).toBe("look_new");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "insufficient_credit", message: "no credits" } },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await createAvatarDefinition
      .run({ type: "prompt", prompt: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(402);
  });
});
