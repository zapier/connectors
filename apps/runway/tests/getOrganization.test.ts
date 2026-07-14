import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getOrganizationDefinition from "../scripts/getOrganization.ts";

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

describe("getOrganization: run", () => {
  it("GETs /organization, carries the version header, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        creditBalance: 100,
        tier: {
          maxMonthlyCreditSpend: 1000,
          models: {
            gen4_image: {
              maxConcurrentGenerations: 2,
              maxDailyGenerations: 100,
            },
          },
        },
      });
    }) as typeof globalThis.fetch;

    const input = getOrganizationDefinition.inputSchema.parse({});
    const { data } = await getOrganizationDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.dev.runwayml.com/v1/organization");
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("X-Runway-Version")).toBe(
      "2024-11-06",
    );
    expect(data.creditBalance).toBe(100);
    expect(getOrganizationDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad_request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = getOrganizationDefinition.inputSchema.parse({});
    const err = await getOrganizationDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
