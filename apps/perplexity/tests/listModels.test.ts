import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listModelsDefinition from "../scripts/listModels.ts";

const { inputSchema, outputSchema } = listModelsDefinition;

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

describe("listModels: inputSchema", () => {
  it("takes no input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("listModels: governance", () => {
  it("is read-only and idempotent", () => {
    expect(listModelsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listModelsDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("listModels: run", () => {
  it("GETs /v1/models and returns the model list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "list",
        data: [
          { id: "perplexity/sonar", object: "model" },
          { id: "openai/gpt-5", object: "model" },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listModelsDefinition.run({}, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe("https://api.perplexity.ai/v1/models");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.data).toHaveLength(2);
    expect(data.data?.[0]?.id).toBe("perplexity/sonar");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "rate_limited", message: "slow down" } },
        { status: 429 },
      )) as typeof globalThis.fetch;

    const err = await listModelsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(429);
  });
});
