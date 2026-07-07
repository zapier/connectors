import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createPageDefinition from "../scripts/createPage.ts";

const { outputSchema } = createPageDefinition;

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

describe("createPage: run", () => {
  it("POSTs to /pages with the sitePage type discriminator, defaults pageLayout, and omits canvasLayout when no content", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "page9", title: "Roadmap" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createPageDefinition.run(
      { siteId: "site123", title: "Roadmap" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site123/pages",
    );
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body["@odata.type"]).toBe("#microsoft.graph.sitePage");
    expect(body["title"]).toBe("Roadmap");
    // name is derived from the title when omitted (Graph 400s without one).
    expect(body["name"]).toBe("Roadmap.aspx");
    // pageLayout defaults to article.
    expect(body["pageLayout"]).toBe("article");
    // No content → no canvasLayout skeleton in the body.
    expect(body).not.toHaveProperty("canvasLayout");

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("builds the single-text-web-part canvasLayout skeleton when content is set", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "page9", title: "Roadmap" });
    }) as typeof globalThis.fetch;

    const html = "<h1>Q3</h1><p>Ship it.</p>";
    await createPageDefinition.run(
      {
        siteId: "site123",
        title: "Roadmap",
        pageLayout: "home",
        content: html,
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    // Explicit pageLayout wins over the article default.
    expect(body["pageLayout"]).toBe("home");
    // The canvasLayout is a fixed skeleton whose only variable is the innerHtml.
    expect(body["canvasLayout"]).toEqual({
      horizontalSections: [
        {
          layout: "oneColumn",
          id: "1",
          columns: [
            {
              id: "1",
              webparts: [
                {
                  "@odata.type": "#microsoft.graph.textWebPart",
                  innerHtml: html,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("derives the page name from the title when omitted, and honors an explicit name (adding .aspx once)", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>);
      return jsonResponse({ id: "p", title: "t" });
    }) as typeof globalThis.fetch;

    // Omitted name → derived from the title, slugified (spaces/punctuation → single hyphens).
    await createPageDefinition.run(
      { siteId: "s", title: "Q3 Planning & Notes!" },
      { fetch: fakeFetch },
    );
    expect(bodies[0]?.["name"]).toBe("Q3-Planning-Notes.aspx");

    // Explicit name without extension → .aspx appended, not slugified.
    await createPageDefinition.run(
      { siteId: "s", title: "Whatever", name: "custom_page" },
      { fetch: fakeFetch },
    );
    expect(bodies[1]?.["name"]).toBe("custom_page.aspx");

    // Explicit name already ending in .aspx → not doubled.
    await createPageDefinition.run(
      { siteId: "s", title: "Whatever", name: "already.aspx" },
      { fetch: fakeFetch },
    );
    expect(bodies[2]?.["name"]).toBe("already.aspx");
  });

  it("throws a ConnectorHttpError carrying the status on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "forbidden" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createPageDefinition
      .run({ siteId: "site123", title: "X" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
