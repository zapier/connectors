import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import localizeAd from "../scripts/localizeAd.ts";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

type Call = { url: string; init: RequestInit | undefined };

const BASE = "https://api.dev.runwayml.com/v1";
const PATH = "/recipes/ad_localization";

describe("localizeAd: run", () => {
  it("POSTs to the recipe URL, sets X-Runway-Version, and returns the task id (wait default false)", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = localizeAd.inputSchema.parse({
      version: "2026-06",
      referenceImageUri: "https://x/ad.png",
      targetLanguage: "ja",
    });
    const { data } = await localizeAd.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${BASE}${PATH}`);
    expect(calls[0]?.init?.method).toBe("POST");
    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("X-Runway-Version")).toBe("2024-11-06");
    expect(data.id).toBe("task_abc");
    expect(localizeAd.outputSchema.safeParse(data).success).toBe(true);
  });

  it("re-wraps flat inputs into { uri } objects in the request body", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = localizeAd.inputSchema.parse({
      version: "2026-06",
      referenceImageUri: "https://x/ad.png",
      targetLanguage: "ja",
    });
    await localizeAd.run(input, { fetch });

    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      version: "2026-06",
      referenceImage: { uri: "https://x/ad.png" },
      targetLanguage: "ja",
    });
  });

  it("polls to a terminal state and returns status + output when wait: true", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (init?.method === "POST") return jsonResponse({ id: "t1" });
      return jsonResponse({
        id: "t1",
        status: "SUCCEEDED",
        createdAt: "2026-07-09T00:00:00Z",
        output: ["https://cdn.runwayml.com/out.mp4"],
      });
    }) as typeof globalThis.fetch;

    const input = localizeAd.inputSchema.parse({
      version: "2026-06",
      referenceImageUri: "https://x/ad.png",
      targetLanguage: "ja",
      wait: true,
    });
    const { data } = await localizeAd.run(input, { fetch });

    expect(calls).toHaveLength(2);
    expect(data.status).toBe("SUCCEEDED");
    expect(data.output?.[0]).toBe("https://cdn.runwayml.com/out.mp4");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad_request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = localizeAd.inputSchema.parse({
      version: "2026-06",
      referenceImageUri: "https://x/ad.png",
      targetLanguage: "ja",
    });
    const err = await localizeAd.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
