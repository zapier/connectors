import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findFilesDefinition from "../scripts/findFiles.ts";

const { outputSchema } = findFilesDefinition;

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

describe("findFiles: run", () => {
  it("builds a /root/search(q='...') function path (default library), unwraps envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "file-1", name: "Budget.xlsx" }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/search?skiptoken=abc",
      });
    }) as typeof globalThis.fetch;

    const { data } = await findFilesDefinition.run(
      { siteId: "site-1", search: "budget report", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/search(q='budget%20report')?%24top=5",
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/search?skiptoken=abc",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied (default-library switch)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findFilesDefinition.run(
      { siteId: "site-1", driveId: "drive-9", search: "notes" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives/drive-9/root/search(q='notes')",
    );
  });

  it("throws a ConnectorHttpError carrying the status on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "no" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await findFilesDefinition
      .run({ siteId: "site-1", search: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
