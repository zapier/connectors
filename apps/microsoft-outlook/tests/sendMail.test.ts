import { describe, expect, it } from "vitest";

import sendMailDefinition from "../scripts/sendMail.ts";

const { outputSchema } = sendMailDefinition;

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

const message = {
  subject: "Hi",
  toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
};

describe("sendMail: run", () => {
  it("POSTs to /me/sendMail and synthesizes a success result (202, no body)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return { ok: true, status: 202 } as unknown as Response;
    }) as typeof globalThis.fetch;

    const { data } = await sendMailDefinition.run({ message }, { fetch });

    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({ message });
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("includes saveToSentItems when set and routes a shared mailbox", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return { ok: true, status: 202 } as unknown as Response;
    }) as typeof globalThis.fetch;

    await sendMailDefinition.run(
      { message, saveToSentItems: false, mailbox: "team@contoso.com" },
      { fetch },
    );
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/sendMail",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      message,
      saveToSentItems: false,
    });
  });

  it("throws a mapped error on non-2xx", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorInvalidRecipients", message: "bad recipient" } },
        { status: 400 },
      )) as typeof globalThis.fetch;
    const err = await sendMailDefinition
      .run({ message }, { fetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("sendMail");
  });
});
