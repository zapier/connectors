import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getHistoricalTraffic.ts";

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

describe("getHistoricalTraffic", () => {
  it("flattens tasks[0].result[0].metrics.organic[] and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          target: "example.com",
          metrics: {
            organic: [
              { year: 2024, month: 1, etv: 12345.6, count: 5000 },
              { year: 2024, month: 2, etv: 13000.1, count: 5100 },
            ],
          },
        },
      ]),
    );
    const { data } = await script.run(
      {
        targets: ["example.com"],
        location_name: "United States",
        language_name: "English",
      },
      { fetch },
    );
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      target: "example.com",
      metrics: [
        { year: 2024, month: 1, etv: 12345.6, organic_count: 5000 },
        { year: 2024, month: 2, etv: 13000.1, organic_count: 5100 },
      ],
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live",
    );
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({
      targets: ["example.com"],
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
          targets: ["example.com"],
          location_name: "United States",
          language_name: "English",
        },
        { fetch },
      ),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
