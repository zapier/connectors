import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getLipsyncDefinition from "../scripts/getLipsync.ts";

const { inputSchema, outputSchema } = getLipsyncDefinition;

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

describe("getLipsync: inputSchema", () => {
  it("accepts a lipsync_id", () => {
    expect(inputSchema.safeParse({ lipsync_id: "ls_123" }).success).toBe(true);
  });

  it("requires lipsync_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getLipsync: governance", () => {
  it("is read-only", () => {
    expect(getLipsyncDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getLipsync: run", () => {
  it("GETs /v3/lipsyncs/{id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "ls_123",
          status: "completed",
          video_url: "https://cdn.heygen.com/out.mp4",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getLipsyncDefinition.run(
      { lipsync_id: "ls_123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/lipsyncs/ls_123");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("ls_123");
    expect(result.status).toBe("completed");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such lipsync" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getLipsyncDefinition
      .run({ lipsync_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
