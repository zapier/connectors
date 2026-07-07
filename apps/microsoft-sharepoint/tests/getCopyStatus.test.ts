import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import getCopyStatusDefinition from "../scripts/getCopyStatus.ts";

const { outputSchema } = getCopyStatusDefinition;

const MONITOR_URL =
  "https://graph.microsoft.com/v1.0/monitor/abc123?tempauth=xyz";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCopyStatus: run", () => {
  it("GETs the passed monitorUrl with a bare fetch and returns the parsed status body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation((async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        status: "completed",
        percentageComplete: 100,
        resourceId: "01COPIEDITEM",
      });
    }) as typeof globalThis.fetch);

    // Credential-free tool — no connection/fetch in run options.
    const { data } = await getCopyStatusDefinition.run({
      monitorUrl: MONITOR_URL,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(calls[0]?.url).toBe(MONITOR_URL);
    // Bare GET — no method, no Authorization header.
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(
      new Headers(calls[0]?.init?.headers).get("authorization"),
    ).toBeNull();

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.status).toBe("completed");
    expect(data.resourceId).toBe("01COPIEDITEM");
  });

  it("throws a ConnectorHttpError carrying the response when the monitor URL is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch);

    const err = await getCopyStatusDefinition
      .run({ monitorUrl: MONITOR_URL })
      .catch((e: unknown) => e);

    // Routed through throwGraphError — the full Graph response rides on
    // error.response instead of being collapsed into a bare status string.
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
