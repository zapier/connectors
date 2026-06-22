import { describe, expect, it } from "vitest";

import createActivityDefinition from "../scripts/createActivity.ts";

const { inputSchema, outputSchema } = createActivityDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("createActivity: inputSchema", () => {
  it("accepts the minimal valid payload (only subject)", () => {
    expect(inputSchema.safeParse({ subject: "Call Acme" }).success).toBe(true);
  });

  it("requires subject", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer deal_id", () => {
    expect(
      inputSchema.safeParse({ subject: "Call", deal_id: "12" }).success,
    ).toBe(false);
  });

  it("accepts HH:MM due_time and duration", () => {
    expect(
      inputSchema.safeParse({
        subject: "Sync",
        due_time: "14:30",
        duration: "01:30",
      }).success,
    ).toBe(true);
  });
});

describe("createActivity: governance", () => {
  it("is a write (not read-only, not destructive)", () => {
    expect(createActivityDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createActivityDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createActivity: run", () => {
  it("POSTs /api/v2/activities with the body and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 88,
          subject: "Call Acme",
          type: "call",
          done: false,
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      subject: "Call Acme",
      type: "call",
      deal_id: 12,
    });
    const { data: result } = await createActivityDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/activities");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]?.init?.body));
    expect(sentBody).toMatchObject({
      subject: "Call Acme",
      type: "call",
      deal_id: 12,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(88);
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Invalid field", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ subject: "x" });
    await expect(
      createActivityDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createActivity: Invalid field/);
  });
});
