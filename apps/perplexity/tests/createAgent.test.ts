import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createAgentDefinition from "../scripts/createAgent.ts";

const { inputSchema, outputSchema } = createAgentDefinition;

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

const COMPLETED = {
  id: "resp_1",
  object: "response",
  created_at: 1700000000,
  status: "completed",
  model: "perplexity/sonar",
  output: [
    {
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "The answer is 42." },
        { type: "output_text", text: " More detail." },
      ],
    },
    {
      type: "search_results",
      results: [
        { title: "Source A", url: "https://a.example", snippet: "excerpt a" },
      ],
    },
  ],
  usage: { input_tokens: 5, output_tokens: 9, total_tokens: 14 },
};

describe("createAgent: inputSchema", () => {
  it("accepts a minimal input (just the question)", () => {
    expect(
      inputSchema.safeParse({ input: "Why is the sky blue?" }).success,
    ).toBe(true);
  });

  it("requires input", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("accepts the structured-output response_format shape", () => {
    expect(
      inputSchema.safeParse({
        input: "extract",
        response_format: {
          type: "json_schema",
          json_schema: { schema: { type: "object" } },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown preset", () => {
    expect(inputSchema.safeParse({ input: "x", preset: "turbo" }).success).toBe(
      false,
    );
  });
});

describe("createAgent: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(createAgentDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("createAgent: run", () => {
  it("POSTs to /v1/agent, defaults the preset, enables web search, and derives answer + sources", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(COMPLETED);
    }) as typeof globalThis.fetch;

    const { data } = await createAgentDefinition.run(
      { input: "Why is the sky blue?" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.perplexity.ai/v1/agent");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({
      input: "Why is the sky blue?",
      preset: "medium",
      tools: [{ type: "web_search" }],
    });
    expect(data.answer).toBe("The answer is 42. More detail.");
    expect(data.sources).toEqual([
      { title: "Source A", url: "https://a.example", snippet: "excerpt a" },
    ]);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("uses model over preset when model is given, and omits the default preset", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(COMPLETED);
    }) as typeof globalThis.fetch;

    await createAgentDefinition.run(
      { input: "x", model: "openai/gpt-5" },
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.model).toBe("openai/gpt-5");
    expect(body.preset).toBeUndefined();
  });

  it("omits the web_search tool when enable_web_search is false", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(COMPLETED);
    }) as typeof globalThis.fetch;

    await createAgentDefinition.run(
      { input: "x", enable_web_search: false },
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.tools).toBeUndefined();
  });

  it("loosens ISO dates to MM/DD/YYYY inside the web_search filters", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(COMPLETED);
    }) as typeof globalThis.fetch;

    await createAgentDefinition.run(
      {
        input: "x",
        search_after_date_filter: "2026-01-15",
        search_domain_filter: ["nature.com"],
      },
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.tools[0].filters).toMatchObject({
      search_after_date_filter: "01/15/2026",
      search_domain_filter: ["nature.com"],
    });
  });

  it("returns empty answer/sources for a queued background run", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        id: "resp_bg",
        object: "response",
        created_at: 1700000000,
        status: "queued",
        model: "perplexity/sonar",
        output: [],
      })) as typeof globalThis.fetch;

    const { data } = await createAgentDefinition.run(
      { input: "deep question", background: true },
      { fetch: fakeFetch },
    );
    expect(data.status).toBe("queued");
    expect(data.answer).toBe("");
    expect(data.sources).toEqual([]);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "invalid_api_key", message: "bad key" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await createAgentDefinition
      .run({ input: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
