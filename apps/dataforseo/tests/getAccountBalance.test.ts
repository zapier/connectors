import { describe, expect, it, vi } from "vitest";

import script from "../scripts/getAccountBalance.ts";

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

describe("getAccountBalance", () => {
  it("unwraps tasks[0].result into items via a GET (no request body)", async () => {
    const fetch = envelopeFetch(
      200,
      okEnvelope([
        {
          login: "user@example.com",
          money: { balance: 123.45, total: 500 },
          rates: { limits: { minute: 2000, simultaneous: 30 } },
        },
      ]),
    );
    const { data } = await script.run({}, { fetch });
    expect(data.items_count).toBe(1);
    expect(data.items?.[0]).toMatchObject({ login: "user@example.com" });
    expect(data.items?.[0]?.money).toMatchObject({ balance: 123.45 });

    // This is a GET-only appendix endpoint: no array-wrapped task body.
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.dataforseo.com/v3/appendix/user_data");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
  });

  it("throws on a task-level status_code error (HTTP 200, success-shaped error)", async () => {
    const fetch = envelopeFetch(200, {
      status_code: 20000,
      status_message: "Ok.",
      tasks: [
        { status_code: 40501, status_message: "Invalid Field.", result: null },
      ],
    });
    await expect(script.run({}, { fetch })).rejects.toThrow(
      /Invalid Field|40501/,
    );
  });
});
