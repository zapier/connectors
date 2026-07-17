import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getLlmMentions.ts";

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

describe("getLlmMentions", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          items: [
            {
              platform: "chat_gpt",
              question: "best running shoes",
              answer: "Nike is a leading brand for running shoes.",
              sources: [
                {
                  title: "Nike Running Shoes",
                  url: "https://nike.com/running",
                  domain: "nike.com",
                },
              ],
            },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      {
        domains: ["nike.com"],
        location_name: "United States",
        language_name: "English",
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      platform: "chat_gpt",
      answer: "Nike is a leading brand for running shoes.",
      sources: [{ url: "https://nike.com/running" }],
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/ai_optimization/llm_mentions/search/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
  });

  it("maps domains/keywords to a bare-key target[] and applies location/language defaults", async () => {
    const fetch = envelopeFetch(200, okEnvelope([]));
    await script.run(
      { domains: ["nike.com"], keywords: ["running shoes"] },
      { fetch },
    );
    const [, init] = fetch.mock.calls[0]!;
    const sent = JSON.parse(String(init?.body));
    expect(sent[0].target).toEqual([
      { domain: "nike.com" },
      { keyword: "running shoes" },
    ]);
    expect(sent[0].location_name).toBe("United States");
    expect(sent[0].language_name).toBe("English");
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
      script.run({ domains: ["nike.com"] }, { fetch }),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
