import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getCreditUsageDefinition from "../scripts/getCreditUsage.ts";

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

describe("getCreditUsage: run", () => {
  it("POSTs /organization/usage with the date range and returns the parsed usage", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        results: [
          {
            date: "2026-06-01",
            usedCredits: [{ model: "gen4_image", amount: 12 }],
          },
        ],
        models: ["gen4_image"],
      });
    }) as typeof globalThis.fetch;

    const input = getCreditUsageDefinition.inputSchema.parse({
      startDate: "2026-06-01",
      beforeDate: "2026-06-30",
    });
    const { data } = await getCreditUsageDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.dev.runwayml.com/v1/organization/usage",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("X-Runway-Version")).toBe(
      "2024-11-06",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      startDate: "2026-06-01",
      beforeDate: "2026-06-30",
    });
    expect(getCreditUsageDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad_request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = getCreditUsageDefinition.inputSchema.parse({
      startDate: "2026-06-01",
      beforeDate: "2026-06-30",
    });
    const err = await getCreditUsageDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
