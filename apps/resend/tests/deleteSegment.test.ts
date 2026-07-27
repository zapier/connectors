import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteSegmentDefinition from "../scripts/deleteSegment.ts";

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

describe("deleteSegment: run", () => {
  it("DELETEs /segments/{id} (encoded) and returns the parsed result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ object: "segment", id: "seg 1", deleted: true });
    }) as typeof globalThis.fetch;

    const input = deleteSegmentDefinition.inputSchema.parse({ id: "seg 1" });
    const { data } = await deleteSegmentDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/segments/seg%201");
    expect(calls[0]?.init?.method).toBe("DELETE");

    expect(data).toEqual({ object: "segment", id: "seg 1", deleted: true });
    expect(deleteSegmentDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError with the not-found hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Segment not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = deleteSegmentDefinition.inputSchema.parse({ id: "missing" });
    const err = await deleteSegmentDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
