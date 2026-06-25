import { describe, expect, it } from "vitest";

import downloadCaptionDefinition from "../scripts/downloadCaption.ts";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("downloadCaption: happy path", () => {
  it("GETs the caption track and returns the raw text with the default format", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const captionText = "1\n00:00:01,000 --> 00:00:04,000\nHello world\n";
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(captionText);
    }) as typeof globalThis.fetch;

    const { data } = await downloadCaptionDefinition.run(
      { id: "cap-1", tfmt: "srt" as const },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/youtube/v3/captions/cap-1");
    expect(calls[0]?.url).toContain("tfmt=srt");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.caption_text).toBe(captionText);
    expect(data.format).toBe("srt");
    expect(downloadCaptionDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("downloadCaption: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message:
              "The permissions associated with the request are not sufficient.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      downloadCaptionDefinition.run(
        { id: "cap-1", tfmt: "srt" as const },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
