import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getKeywordSuggestions.ts";

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

describe("getKeywordSuggestions", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          items_count: 1,
          items: [
            {
              keyword: "best running shoes",
              keyword_info: {
                search_volume: 12000,
                cpc: 1.25,
                competition: 0.42,
              },
              keyword_properties: { keyword_difficulty: 37 },
            },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      {
        keyword: "running shoes",
        location_name: "United States",
        language_name: "English",
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      keyword: "best running shoes",
      search_volume: 12000,
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      keyword: "running shoes",
      location_name: "United States",
      language_name: "English",
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
        },
        { fetch },
      ),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
