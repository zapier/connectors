import { describe, expect, it } from "vitest";

import createDocumentFromTemplateDefinition from "../scripts/createDocumentFromTemplate.ts";

const { inputSchema, outputSchema } = createDocumentFromTemplateDefinition;

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

describe("createDocumentFromTemplate: inputSchema", () => {
  it("requires templateId and title", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ templateId: "t" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ templateId: "t", title: "New" }).success,
    ).toBe(true);
  });
});

describe("createDocumentFromTemplate: governance", () => {
  it("is not read-only (it writes)", () => {
    expect(createDocumentFromTemplateDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
  });
});

describe("createDocumentFromTemplate: run", () => {
  it("copies the template then batchUpdates, mapping per-placeholder occurrencesChanged", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes("/copy")) {
        return jsonResponse({ id: "newid" });
      }
      if (url.includes(":batchUpdate")) {
        return jsonResponse({
          replies: [
            { replaceAllText: { occurrencesChanged: 2 } },
            { replaceAllText: { occurrencesChanged: 1 } },
          ],
        });
      }
      throw new Error(`unexpected url ${url}`);
    }) as typeof globalThis.fetch;

    const { data: result } = await createDocumentFromTemplateDefinition.run(
      {
        templateId: "tmpl-1",
        title: "Filled Doc",
        replacements: { "{{name}}": "Ada", "{{date}}": "2026-06-18" },
      },
      { fetch: fakeFetch },
    );

    // Two fetch calls: Drive copy, then Docs batchUpdate.
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toContain("/files/tmpl-1/copy");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[1]?.url).toContain(":batchUpdate");
    expect(calls[1]?.init?.method).toBe("POST");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.documentId).toBe("newid");
    expect(result.title).toBe("Filled Doc");
    expect(result.url).toBe("https://docs.google.com/document/d/newid/edit");
    expect(result.replacementsApplied).toEqual([
      { placeholder: "{{name}}", occurrencesChanged: 2 },
      { placeholder: "{{date}}", occurrencesChanged: 1 },
    ]);
  });

  it("skips the batchUpdate when replacements is empty (only one fetch call)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      if (url.includes("/copy")) return jsonResponse({ id: "newid" });
      throw new Error(`unexpected url ${url}`);
    }) as typeof globalThis.fetch;

    const { data: result } = await createDocumentFromTemplateDefinition.run(
      { templateId: "tmpl-1", title: "Empty Copy" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/copy");
    expect(result.documentId).toBe("newid");
    expect(result.replacementsApplied).toEqual([]);
  });

  it("throws a plain Error when the Drive copy fails (404)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      if (url.includes("/copy")) {
        return jsonResponse(
          {
            error: {
              code: 404,
              message: "File not found: tmpl-1.",
              status: "NOT_FOUND",
            },
          },
          { status: 404 },
        );
      }
      throw new Error(`unexpected url ${url}`);
    }) as typeof globalThis.fetch;

    const err = await createDocumentFromTemplateDefinition
      .run({ templateId: "tmpl-1", title: "X" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("404");
  });
});
