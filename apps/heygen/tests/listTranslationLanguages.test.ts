import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listTranslationLanguagesDefinition from "../scripts/listTranslationLanguages.ts";

const { inputSchema, outputSchema } = listTranslationLanguagesDefinition;

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

describe("listTranslationLanguages: inputSchema", () => {
  it("accepts an empty input (takes no input)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects unexpected fields (strict)", () => {
    expect(inputSchema.safeParse({ limit: 10 }).success).toBe(false);
  });
});

describe("listTranslationLanguages: governance", () => {
  it("is read-only", () => {
    expect(listTranslationLanguagesDefinition.annotations?.readOnlyHint).toBe(
      true,
    );
  });
});

describe("listTranslationLanguages: run", () => {
  it("GETs /v3/video-translations/languages and unwraps {data:{languages}}", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { languages: ["Spanish", "French", "German"] },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listTranslationLanguagesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/video-translations/languages",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.languages).toEqual(["Spanish", "French", "German"]);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "server_error", message: "boom" } },
        { status: 500 },
      )) as typeof globalThis.fetch;

    const err = await listTranslationLanguagesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(500);
  });
});
