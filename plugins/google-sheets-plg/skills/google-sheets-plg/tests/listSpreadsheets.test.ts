import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listSpreadsheets from "../skills/google-sheets-plg/scripts/listSpreadsheets.ts";

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

describe("listSpreadsheets: run", () => {
  it("queries the Drive files endpoint with a spreadsheet mimeType filter", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        files: [
          {
            id: "1A",
            name: "Budget",
            modifiedTime: "2026-01-01T00:00:00Z",
            webViewLink: "https://docs.google.com/spreadsheets/d/1A/edit",
          },
        ],
        nextPageToken: "tok",
      });
    }) as typeof globalThis.fetch;

    const input = listSpreadsheets.inputSchema.parse({});
    const { data: result } = await listSpreadsheets.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.url).toMatch(
      /^https:\/\/www\.googleapis\.com\/drive\/v3\/files/,
    );
    const q = new URL(calls[0]!.url).searchParams.get("q")!;
    expect(q).toContain("mimeType='application/vnd.google-apps.spreadsheet'");

    expect(result).toEqual({
      spreadsheets: [
        {
          spreadsheet_id: "1A",
          name: "Budget",
          modified_time: "2026-01-01T00:00:00Z",
          web_view_link: "https://docs.google.com/spreadsheets/d/1A/edit",
        },
      ],
      next_page_token: "tok",
    });
    expect(listSpreadsheets.outputSchema.safeParse(result).success).toBe(true);
  });

  it("adds a name-contains clause when name_contains is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ files: [] });
    }) as typeof globalThis.fetch;

    const input = listSpreadsheets.inputSchema.parse({
      name_contains: "Budget",
    });
    const { data: result } = await listSpreadsheets.run(input, {
      fetch: fakeFetch,
    });

    const q = new URL(calls[0]!.url).searchParams.get("q")!;
    expect(q).toContain("name contains 'Budget'");
    expect(result.next_page_token).toBeNull();
  });

  it("surfaces a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: 401, status: "UNAUTHENTICATED", message: "no token" },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;
    const input = listSpreadsheets.inputSchema.parse({});
    const err = await listSpreadsheets
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});

describe("listSpreadsheets: governance", () => {
  it("is a read-only operation", () => {
    expect(listSpreadsheets.annotations?.readOnlyHint).toBe(true);
  });
});
