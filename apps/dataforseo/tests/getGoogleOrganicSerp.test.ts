import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getGoogleOrganicSerp.ts";

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

describe("getGoogleOrganicSerp", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          type: "organic",
          rank_absolute: 1,
          rank_group: 1,
          title: "Example",
          url: "https://example.com",
          domain: "example.com",
          description: "An example result.",
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
      type: "organic",
      domain: "example.com",
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      keyword: "running shoes",
      location_name: "United States",
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

  it("throws on a top-level status_code error", async () => {
    const fetch = envelopeFetch(200, {
      status_code: 40100,
      status_message: "Auth error.",
      tasks: [],
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
    ).rejects.toThrow(/Auth error|40100/);
  });
});
