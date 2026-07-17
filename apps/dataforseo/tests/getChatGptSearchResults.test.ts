import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getChatGptSearchResults.ts";

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

describe("getChatGptSearchResults", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          search_results: [
            {
              type: "chatgpt_search_result",
              url: "https://example.com/running-shoes",
              title: "Best Running Shoes 2024",
              description: "Top brands compared.",
              domain: "example.com",
              breadcrumb: "example.com › shoes",
            },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      {
        keyword: "best running shoes",
        location_name: "United States",
        language_name: "English",
        force_web_search: true,
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      type: "chatgpt_search_result",
      url: "https://example.com/running-shoes",
      title: "Best Running Shoes 2024",
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      keyword: "best running shoes",
      location_name: "United States",
      language_name: "English",
      force_web_search: true,
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
        {
          keyword: "x",
          location_name: "United States",
          language_name: "English",
          force_web_search: false,
        },
        { fetch },
      ),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
