import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import generateVideoFromImageDefinition from "../scripts/generateVideoFromImage.ts";

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

const minimalInput = {
  promptImage: "https://example.com/start.png",
  model: "gen4_turbo",
};

describe("generateVideoFromImage: run", () => {
  it("happy path (async, default wait=false) POSTs once and returns the task id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "task_abc" });
    }) as typeof globalThis.fetch;

    const input = generateVideoFromImageDefinition.inputSchema.parse({
      ...minimalInput,
    });
    const { data } = await generateVideoFromImageDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.dev.runwayml.com/v1/image_to_video",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("X-Runway-Version")).toBe(
      "2024-11-06",
    );
    expect(data.id).toBe("task_abc");
    expect(
      generateVideoFromImageDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });

  it("wait:true polls the task to a terminal state", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (init?.method === "POST") return jsonResponse({ id: "t1" });
      return jsonResponse({
        id: "t1",
        status: "SUCCEEDED",
        createdAt: "2026-07-09T00:00:00Z",
        output: ["https://cdn.runwayml.com/out.png"],
      });
    }) as typeof globalThis.fetch;

    const input = generateVideoFromImageDefinition.inputSchema.parse({
      ...minimalInput,
      wait: true,
    });
    const { data } = await generateVideoFromImageDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[1]?.url).toBe("https://api.dev.runwayml.com/v1/tasks/t1");
    expect(data.status).toBe("SUCCEEDED");
    expect(data.output?.[0]).toBe("https://cdn.runwayml.com/out.png");
  });

  it("error path throws a ConnectorHttpError carrying the status", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: "bad_request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = generateVideoFromImageDefinition.inputSchema.parse({
      ...minimalInput,
    });
    const err = await generateVideoFromImageDefinition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
