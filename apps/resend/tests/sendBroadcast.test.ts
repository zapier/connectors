import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import sendBroadcastDefinition from "../scripts/sendBroadcast.ts";

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

describe("sendBroadcast: run", () => {
  it("puts broadcast_id in the path and scheduled_at in the body when provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "bc_1" });
    }) as typeof globalThis.fetch;

    const input = sendBroadcastDefinition.inputSchema.parse({
      broadcast_id: "bc_1",
      scheduled_at: "2026-08-05T11:52:01Z",
    });
    const { data } = await sendBroadcastDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    // broadcast_id rides in the PATH.
    expect(calls[0]?.url).toBe("https://api.resend.com/broadcasts/bc_1/send");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    // broadcast_id must NOT leak into the body; scheduled_at rides in the body.
    expect(sent.broadcast_id).toBeUndefined();
    expect(sent.scheduled_at).toBe("2026-08-05T11:52:01Z");

    expect(data).toEqual({ id: "bc_1" });
    expect(sendBroadcastDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("omits scheduled_at from the body when not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "bc_1" });
    }) as typeof globalThis.fetch;

    const input = sendBroadcastDefinition.inputSchema.parse({
      broadcast_id: "bc_1",
    });
    await sendBroadcastDefinition.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe("https://api.resend.com/broadcasts/bc_1/send");
    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent).toEqual({});
    expect("scheduled_at" in sent).toBe(false);
    expect(sent.broadcast_id).toBeUndefined();
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Broadcast not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = sendBroadcastDefinition.inputSchema.parse({
      broadcast_id: "missing",
    });
    const err = await sendBroadcastDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
