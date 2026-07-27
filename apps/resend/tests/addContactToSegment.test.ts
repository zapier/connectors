import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addContactToSegmentDefinition from "../scripts/addContactToSegment.ts";

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

describe("addContactToSegment: run", () => {
  it("POSTs both ids in the path with no body and returns the parsed id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "seg_1" });
    }) as typeof globalThis.fetch;

    const input = addContactToSegmentDefinition.inputSchema.parse({
      contact_id: "user@example.com",
      segment_id: "seg_1",
    });
    const { data } = await addContactToSegmentDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    // Both ids ride in the PATH (contact email percent-encoded), no query/body.
    expect(calls[0]?.url).toBe(
      "https://api.resend.com/contacts/user%40example.com/segments/seg_1",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    // Quirk: no request body on this POST.
    expect(calls[0]?.init?.body).toBeUndefined();

    expect(data).toEqual({ id: "seg_1" });
    expect(
      addContactToSegmentDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "not_found",
          message: "Segment not found.",
          statusCode: 404,
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = addContactToSegmentDefinition.inputSchema.parse({
      contact_id: "c_1",
      segment_id: "missing",
    });
    const err = await addContactToSegmentDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
    expect((err as ConnectorHttpError).message).toContain(
      "no resource matched",
    );
  });
});
