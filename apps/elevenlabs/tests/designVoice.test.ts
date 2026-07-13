import { existsSync } from "node:fs";

import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import designVoiceDefinition from "../scripts/designVoice.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Parsing the minimal input through the
// tool's own inputSchema applies the defaults type-safely.
const { inputSchema } = designVoiceDefinition;

const PREVIEW_BYTES = new Uint8Array([1, 2, 3]);
const PREVIEW_BASE64 = Buffer.from(PREVIEW_BYTES).toString("base64");

// Schema minimums: voice_description >= 20 chars, text >= 100 chars.
const VOICE_DESCRIPTION =
  "A warm, gravelly male narrator in his 60s with a slight Irish accent.";
const SAMPLE_TEXT =
  "Once upon a time, in a quiet village nestled between rolling green hills, " +
  "there lived a storyteller whose voice carried across generations.";

function wireResponse(): Response {
  return new Response(
    JSON.stringify({
      previews: [
        {
          generated_voice_id: "gen1",
          audio_base_64: PREVIEW_BASE64,
          media_type: "audio/mpeg",
          duration_secs: 3.2,
          language: "en",
        },
      ],
      text: "sample",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("designVoice: run", () => {
  it("writes each preview to a file and renames the wire audio_base_64 field", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return wireResponse();
    }) as typeof globalThis.fetch;

    const { data } = await designVoiceDefinition.run(
      inputSchema.parse({
        voice_description: VOICE_DESCRIPTION,
        text: SAMPLE_TEXT,
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/text-to-voice/design",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      voice_description: VOICE_DESCRIPTION,
      text: SAMPLE_TEXT,
      model_id: "eleven_multilingual_ttv_v2",
    });

    expect(data.text).toBe("sample");
    expect(data.previews).toHaveLength(1);
    const preview = data.previews[0];
    if (preview === undefined) throw new Error("preview missing");
    expect(preview.generated_voice_id).toBe("gen1");
    expect(preview.media_type).toBe("audio/mpeg");
    expect(preview.duration_secs).toBe(3.2);
    expect(preview.language).toBe("en");
    expect(preview.audio_base64).toBeUndefined();
    expect(preview).not.toHaveProperty("audio_base_64");
    const previewPath = preview.audio_path;
    expect(typeof previewPath).toBe("string");
    if (previewPath === undefined) throw new Error("audio_path missing");
    expect(existsSync(previewPath)).toBe(true);
  });

  it("returns each preview inline as audio_base64 when return_base64 is true", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      wireResponse()) as typeof globalThis.fetch;

    const { data } = await designVoiceDefinition.run(
      inputSchema.parse({
        voice_description: VOICE_DESCRIPTION,
        text: SAMPLE_TEXT,
        return_base64: true,
      }),
      { fetch: fakeFetch },
    );

    const preview = data.previews[0];
    if (preview === undefined) throw new Error("preview missing");
    expect(preview.audio_base64).toBe(PREVIEW_BASE64);
    expect(preview.audio_path).toBeUndefined();
    expect(preview).not.toHaveProperty("audio_base_64");
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          detail: {
            code: "insufficient_credits",
            message: "Credits exhausted.",
          },
        }),
        { status: 402, headers: { "content-type": "application/json" } },
      )) as typeof globalThis.fetch;

    const err = await designVoiceDefinition
      .run(
        inputSchema.parse({
          voice_description: VOICE_DESCRIPTION,
          text: SAMPLE_TEXT,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(402);
    expect(httpErr.message).toContain("insufficient_credits");
    expect(httpErr.message).toContain("getUserSubscription");
  });
});
