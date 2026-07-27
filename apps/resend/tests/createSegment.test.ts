import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createSegmentDefinition from "../scripts/createSegment.ts";

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

describe("createSegment: run", () => {
  it("POSTs /segments, carries name in the body, and returns the parsed segment", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "segment", id: "seg1", name: "VIP" });
    }) as typeof globalThis.fetch;

    const input = createSegmentDefinition.inputSchema.parse({ name: "VIP" });
    const { data } = await createSegmentDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/segments");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.name).toBe("VIP");

    expect(data).toEqual({ object: "segment", id: "seg1", name: "VIP" });
    expect(createSegmentDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError with the restricted-key hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "restricted_api_key",
          message: "This API key is restricted.",
          statusCode: 401,
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const input = createSegmentDefinition.inputSchema.parse({ name: "VIP" });
    const err = await createSegmentDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
    expect((err as ConnectorHttpError).message).toContain(
      "can only send email",
    );
  });
});
