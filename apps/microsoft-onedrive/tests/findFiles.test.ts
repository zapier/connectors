import { describe, expect, it } from "vitest";

import findFilesDefinition from "../scripts/findFiles.ts";

const { outputSchema } = findFilesDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("findFiles: run", () => {
  it("bakes the search term into the own-drive search path and unwraps the envelope", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        value: [{ id: "item-1", name: "Q3 report.docx" }],
      });
    }) as typeof globalThis.fetch;

    const { data } = await findFilesDefinition.run(
      { search: "Q3 report", limit: 10 },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain(
      `${GRAPH}/me/drive/root/search(q='Q3%20report')`,
    );
    expect(new URL(calls[0]!).searchParams.get("$top")).toBe("10");
    expect(data.items).toHaveLength(1);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findFilesDefinition.run(
      { driveId: "drive-9", search: "budget" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain(
      `${GRAPH}/drives/drive-9/root/search(q='budget')`,
    );
  });
});
