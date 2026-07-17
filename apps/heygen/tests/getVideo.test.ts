import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getVideoDefinition from "../scripts/getVideo.ts";

const { inputSchema, outputSchema } = getVideoDefinition;

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

describe("getVideo: inputSchema", () => {
  it("accepts a video_id", () => {
    expect(inputSchema.safeParse({ video_id: "v_abc123" }).success).toBe(true);
  });

  it("requires video_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getVideo: governance", () => {
  it("is read-only and non-destructive", () => {
    expect(getVideoDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getVideoDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getVideo: run", () => {
  it("GETs /v3/videos/{video_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "v_abc123",
          title: "Demo",
          status: "completed",
          video_url: "https://cdn.heygen.com/v_abc123.mp4",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getVideoDefinition.run(
      { video_id: "v_abc123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/videos/v_abc123");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("v_abc123");
    expect(result.status).toBe("completed");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such video" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getVideoDefinition
      .run({ video_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
