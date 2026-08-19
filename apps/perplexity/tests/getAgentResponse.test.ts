import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getAgentResponseDefinition from "../scripts/getAgentResponse.ts";

const { inputSchema, outputSchema } = getAgentResponseDefinition;

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

describe("getAgentResponse: inputSchema", () => {
  it("requires response_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ response_id: "resp_1" }).success).toBe(true);
  });
});

describe("getAgentResponse: governance", () => {
  it("is read-only", () => {
    expect(getAgentResponseDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getAgentResponse: run", () => {
  it("GETs /v1/responses/{id} (id url-encoded) and derives answer + sources", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "resp/1",
        object: "response",
        created_at: 1700000000,
        status: "completed",
        model: "perplexity/sonar",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "Done." }],
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await getAgentResponseDefinition.run(
      { response_id: "resp/1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.perplexity.ai/v1/responses/resp%2F1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.answer).toBe("Done.");
    expect(data.sources).toEqual([]);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on a bad id (400)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such response" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await getAgentResponseDefinition
      .run({ response_id: "nope" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
