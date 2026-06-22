import { describe, expect, it } from "vitest";

import updateDealDefinition from "../scripts/updateDeal.ts";

const { inputSchema, outputSchema } = updateDealDefinition;

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

describe("updateDeal: inputSchema", () => {
  it("accepts a minimal valid input (id + a field)", () => {
    expect(inputSchema.safeParse({ id: 7, title: "New" }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ title: "New" }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "7" }).success).toBe(false);
  });
});

describe("updateDeal: governance", () => {
  it("is a non-destructive write", () => {
    expect(updateDealDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateDealDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateDeal: run", () => {
  it("PATCHes /api/v2/deals/{id} with the input body and unwraps data", async () => {
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
          title: "Renamed deal",
          status: "won",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      id: 7,
      title: "Renamed deal",
      status: "won",
    });
    const { data: result } = await updateDealDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/deals/7");
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      title: string;
      status: string;
    };
    expect(sent.title).toBe("Renamed deal");
    expect(sent.status).toBe("won");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(7);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "invalid stage", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 7, stage_id: 99 });
    await expect(
      updateDealDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updateDeal: invalid stage/);
  });
});
