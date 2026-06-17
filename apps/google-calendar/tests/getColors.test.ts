import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getColorsDefinition from "../scripts/getColors.ts";

const { outputSchema } = getColorsDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("getColors: run", () => {
  it("GETs /colors and returns the color palettes", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        event: { "1": { background: "#fff", foreground: "#000" } },
        calendar: {},
      });
    }) as typeof globalThis.fetch;

    const { data } = await getColorsDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://www.googleapis.com/calendar/v3/colors");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.event?.["1"]?.background).toBe("#fff");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 429, message: "Rate Limit Exceeded" } },
        { status: 429 },
      )) as typeof globalThis.fetch;

    const err = await getColorsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(429);
  });
});
