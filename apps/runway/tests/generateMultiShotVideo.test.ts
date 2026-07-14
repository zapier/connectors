import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import generateMultiShotVideo from "../scripts/generateMultiShotVideo.ts";

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
const PATH = "/recipes/multi_shot_video";

describe("generateMultiShotVideo: inputSchema", () => {
  it("rejects auto mode without a prompt", () => {
    expect(
      generateMultiShotVideo.inputSchema.safeParse({
        version: "2026-06",
        mode: "auto",
      }).success,
    ).toBe(false);
  });

  it("rejects custom mode without shots", () => {
    expect(
      generateMultiShotVideo.inputSchema.safeParse({
        version: "2026-06",
        mode: "custom",
      }).success,
    ).toBe(false);
  });
});

describe("generateMultiShotVideo: run", () => {
  it("POSTs to the recipe URL, sets X-Runway-Version, and returns the task id (auto, wait default false)", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "auto",
      prompt: "a story",
    });
    const { data } = await generateMultiShotVideo.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${BASE}${PATH}`);
    expect(calls[0]?.init?.method).toBe("POST");
    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("X-Runway-Version")).toBe("2024-11-06");
    expect(data.id).toBe("task_abc");
    expect(generateMultiShotVideo.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("auto mode: body carries prompt and no shots", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "auto",
      prompt: "a story",
    });
    await generateMultiShotVideo.run(input, { fetch });

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({ mode: "auto", prompt: "a story" });
    expect(body).not.toHaveProperty("shots");
  });

  it("custom mode: body carries a shots array (length 3) and no prompt", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "custom",
      shots: [
        { prompt: "s1", duration: 3 },
        { prompt: "s2", duration: 3 },
        { prompt: "s3", duration: 4 },
      ],
    });
    await generateMultiShotVideo.run(input, { fetch });

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.shots).toHaveLength(3);
    expect(body).not.toHaveProperty("prompt");
  });

  it("wraps firstFrameUri into firstFrame: { uri } in the request body", async () => {
    const calls: Call[] = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "auto",
      prompt: "a story",
      firstFrameUri: "https://x/f.png",
    });
    await generateMultiShotVideo.run(input, { fetch });

    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      firstFrame: { uri: "https://x/f.png" },
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

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "auto",
      prompt: "a story",
      wait: true,
    });
    const { data } = await generateMultiShotVideo.run(input, { fetch });

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

    const input = generateMultiShotVideo.inputSchema.parse({
      version: "2026-06",
      mode: "auto",
      prompt: "a story",
    });
    const err = await generateMultiShotVideo
      .run(input, { fetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
