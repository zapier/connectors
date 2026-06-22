import { describe, expect, it } from "vitest";

import createLeadDefinition from "../scripts/createLead.ts";

const { inputSchema, outputSchema } = createLeadDefinition;

const LEAD_UUID = "adf21080-0e10-11e9-9a1f-3b9a8c3a1f00";

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

describe("createLead: inputSchema", () => {
  it("accepts the minimal valid payload (title + person_id)", () => {
    expect(
      inputSchema.safeParse({ title: "Acme expansion", person_id: 9 }).success,
    ).toBe(true);
  });

  it("requires title", () => {
    expect(inputSchema.safeParse({ person_id: 9 }).success).toBe(false);
  });

  it("rejects a non-integer person_id", () => {
    expect(inputSchema.safeParse({ title: "x", person_id: "9" }).success).toBe(
      false,
    );
  });

  it("accepts a nested value object", () => {
    expect(
      inputSchema.safeParse({
        title: "x",
        organization_id: 4,
        value: { amount: 1200, currency: "USD" },
      }).success,
    ).toBe(true);
  });

  it("rejects a payload with no person_id or organization_id", () => {
    const parsed = inputSchema.safeParse({ title: "x" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "At least one of person_id or organization_id is required.",
    );
  });
});

describe("createLead: governance", () => {
  it("is a write (not read-only, not destructive)", () => {
    expect(createLeadDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createLeadDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createLead: run", () => {
  it("POSTs /v1/leads with the body and unwraps a UUID-keyed record", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: LEAD_UUID,
          title: "Acme expansion",
          owner_id: 3,
          person_id: 9,
          add_time: "2026-01-01 00:00:00",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      title: "Acme expansion",
      person_id: 9,
    });
    const { data: result } = await createLeadDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/leads");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]?.init?.body));
    expect(sentBody).toMatchObject({
      title: "Acme expansion",
      person_id: 9,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: string }).id).toBe(LEAD_UUID);
    expect((result as { add_time: string }).add_time).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Invalid field", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ title: "x", person_id: 9 });
    await expect(
      createLeadDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createLead: Invalid field/);
  });
});
