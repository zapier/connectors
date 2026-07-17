import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getBacklinkAnchors.ts";

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

describe("getBacklinkAnchors", () => {
  it("unwraps tasks[0].result into items and array-wraps the request", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          anchor: "click here",
          backlinks: 1290,
          referring_domains: 310,
          first_seen: "2021-08-01 00:00:00 +00:00",
        },
      ]),
    );
    const { data } = await script.run({ target: "example.com" }, { fetch });
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({
      anchor: "click here",
      backlinks: 1290,
    });

    // Request goes to the live endpoint and the task params are wrapped in an array.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.dataforseo.com/v3/backlinks/anchors/live");
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(Array.isArray(sent)).toBe(true);
    expect(sent[0]).toMatchObject({ target: "example.com" });
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
      script.run({ target: "example.com" }, { fetch }),
    ).rejects.toThrow(/Invalid Field|40501/);
  });
});
