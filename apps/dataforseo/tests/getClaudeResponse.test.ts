import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getClaudeResponse.ts";

/** Build a fetch mock returning a DataForSEO envelope with the given HTTP status + JSON body. */
const envelopeFetch = (status: number, body: unknown) =>
  vi.fn<
    (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  >(async () => new Response(JSON.stringify(body), { status }));

/** A well-formed success envelope wrapping one task's result rows. */
const okEnvelope = (result: unknown[]) => ({
  status_code: 20000,
  status_message: "Ok.",
  cost: 0.0025,
  tasks: [
    {
      status_code: 20000,
      status_message: "Ok.",
      result_count: result.length,
      result,
    },
  ],
});

describe("getClaudeResponse", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          model_name: "claude-sonnet-4",
          money_spent: 0.003,
          items: [
            {
              type: "message",
              sections: [{ text: "The capital of France is Paris." }],
            },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      {
        user_prompt: "What is the capital of France?",
        model_name: "claude-sonnet-4",
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      model_name: "claude-sonnet-4",
      message: "The capital of France is Paris.",
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/ai_optimization/claude/llm_responses/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      user_prompt: "What is the capital of France?",
      model_name: "claude-sonnet-4",
    });
  });

  it("throws on a task-level status_code error (HTTP 200, success-shaped error)", async () => {
    const fetch = envelopeFetch(200, {
      status_code: 20000,
      status_message: "Ok.",
      tasks: [
        { status_code: 40501, status_message: "Invalid Field.", result: null },
      ],
    });
    await expect(
      script.run(
        { user_prompt: "x", model_name: "claude-sonnet-4" },
        { fetch },
      ),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
