import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getKeywordOverview.ts";

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

describe("getKeywordOverview", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    // The API nests the rows one level deep (result[0].items[]) and nests the
    // metrics under keyword_info / keyword_properties / search_intent_info.
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          items_count: 1,
          items: [
            {
              keyword: "running shoes",
              keyword_info: {
                search_volume: 90500,
                cpc: 0.98,
                competition: 0.55,
              },
              keyword_properties: { keyword_difficulty: 61 },
              search_intent_info: { main_intent: "commercial" },
            },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      {
        keywords: ["running shoes", "trail shoes"],
        location_name: "United States",
        language_name: "English",
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      keyword: "running shoes",
      search_volume: 90500,
      cpc: 0.98,
      competition: 0.55,
      keyword_difficulty: 61,
      search_intent: "commercial",
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      keywords: ["running shoes", "trail shoes"],
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
          keywords: ["x"],
          location_name: "United States",
          language_name: "English",
        },
        { fetch },
      ),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
