import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import sendEmailDefinition from "../scripts/sendEmail.ts";

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

describe("sendEmail: run", () => {
  it("POSTs /emails, sends the body, and returns the parsed id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "e1" });
    }) as typeof globalThis.fetch;

    const input = sendEmailDefinition.inputSchema.parse({
      from: "onboarding@resend.dev", // pii:allow -- Resend public sandbox address, not real PII
      to: ["a@example.com", "b@example.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
      attachments: [
        {
          path: "https://cdn.example.com/invoice.pdf",
          filename: "invoice.pdf",
        },
      ],
    });
    const { data } = await sendEmailDefinition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/emails");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.to).toEqual(["a@example.com", "b@example.com"]);
    expect(sent.subject).toBe("Hi");
    expect(sent.attachments[0].path).toBe(
      "https://cdn.example.com/invoice.pdf",
    );

    expect(data).toEqual({ id: "e1" });
    expect(sendEmailDefinition.outputSchema.safeParse(data).success).toBe(true);
  });

  it("error path throws a ConnectorHttpError with the unverified-domain hint", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          name: "validation_error",
          message: "The domain is not verified.",
          statusCode: 403,
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = sendEmailDefinition.inputSchema.parse({
      from: "me@unverified.com", // pii:allow -- example address, not real PII
      to: ["a@example.com"],
      subject: "Hi",
    });
    const err = await sendEmailDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
    expect((err as ConnectorHttpError).message).toContain(
      "sender domain isn't verified",
    );
  });
});
