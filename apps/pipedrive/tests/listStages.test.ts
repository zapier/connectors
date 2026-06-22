import { describe, expect, it } from "vitest";

import listStagesDefinition from "../scripts/listStages.ts";

const { inputSchema, outputSchema } = listStagesDefinition;

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

describe("listStages: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a pipeline_id filter", () => {
    expect(inputSchema.safeParse({ pipeline_id: 1 }).success).toBe(true);
  });
});

describe("listStages: governance", () => {
  it("is read-only", () => {
    expect(listStagesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listStagesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listStages: run", () => {
  it("GETs /api/v2/stages and unwraps the cursor list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: [{ id: 10, name: "Qualified", pipeline_id: 1, order_nr: 1 }],
        additional_data: { next_cursor: "C1" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listStagesDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/stages?limit=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_cursor: string | null }).next_cursor).toBe("C1");
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Forbidden", error_info: "see docs" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listStagesDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listStages/);
  });
});
