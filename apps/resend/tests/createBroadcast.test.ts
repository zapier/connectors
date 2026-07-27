import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createBroadcastDefinition from "../scripts/createBroadcast.ts";

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

describe("createBroadcast: run", () => {
  it("POSTs /broadcasts, sends the body, and returns the parsed id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "bc_1" });
    }) as typeof globalThis.fetch;

    const input = createBroadcastDefinition.inputSchema.parse({
      segment_id: "seg_1",
      from: "Acme <hello@acme.com>", // pii:allow -- example address, not real PII
      subject: "Launch day",
      html: "<p>Hi</p>",
      name: "Launch broadcast",
    });
    const { data } = await createBroadcastDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/broadcasts");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.segment_id).toBe("seg_1");
    expect(sent.from).toBe("Acme <hello@acme.com>"); // pii:allow -- example address, not real PII
    expect(sent.subject).toBe("Launch day");
    expect(sent.html).toBe("<p>Hi</p>");
    expect(sent.name).toBe("Launch broadcast");

    expect(data).toEqual({ id: "bc_1" });
    expect(createBroadcastDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError with the unverified-domain hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "validation_error",
          message:
            "The resend.dev domain can only be used for testing; verify your own domain to send broadcasts.",
          statusCode: 403,
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = createBroadcastDefinition.inputSchema.parse({
      segment_id: "seg_1",
      from: "onboarding@resend.dev", // pii:allow -- Resend public sandbox address, not real PII
      subject: "Launch day",
      html: "<p>Hi</p>",
    });
    const err = await createBroadcastDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
    expect((err as ConnectorHttpError).message).toContain(
      "sender domain isn't verified",
    );
  });
});
