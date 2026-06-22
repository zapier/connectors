import { describe, expect, it } from "vitest";

import createDealDefinition from "../scripts/createDeal.ts";

const { inputSchema, outputSchema } = createDealDefinition;

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

describe("createDeal: inputSchema", () => {
  it("accepts a minimal valid input (title only)", () => {
    expect(inputSchema.safeParse({ title: "Acme renewal" }).success).toBe(true);
  });

  it("requires title", () => {
    expect(inputSchema.safeParse({ value: 1200 }).success).toBe(false);
  });

  it("rejects a non-integer person_id", () => {
    expect(inputSchema.safeParse({ title: "x", person_id: 1.5 }).success).toBe(
      false,
    );
  });
});

describe("createDeal: governance", () => {
  it("is a non-destructive write", () => {
    expect(createDealDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createDealDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createDeal: run", () => {
  it("POSTs /api/v2/deals with the input body and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 7,
          title: "Acme renewal",
          value: 1200,
          currency: "USD",
          status: "open",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      title: "Acme renewal",
      value: 1200,
      currency: "USD",
    });
    const { data: result } = await createDealDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/deals");
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      title: string;
      value: number;
    };
    expect(sent.title).toBe("Acme renewal");
    expect(sent.value).toBe(1200);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(7);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "title required", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ title: "x" });
    await expect(
      createDealDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createDeal: title required/);
  });
});
