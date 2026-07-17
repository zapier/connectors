import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getSearchIntent.ts";

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

describe("getSearchIntent", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          keyword: "buy running shoes",
          keyword_intent: { label: "transactional", probability: 0.92 },
          secondary_keyword_intents: [
            { label: "commercial", probability: 0.31 },
          ],
        },
      ]),
    );
    const { data } = await script.run(
      { keywords: ["buy running shoes"], language_name: "English" },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      keyword: "buy running shoes",
      keyword_intent: { label: "transactional" },
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/search_intent/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      keywords: ["buy running shoes"],
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
      script.run({ keywords: ["x"], language_name: "English" }, { fetch }),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
