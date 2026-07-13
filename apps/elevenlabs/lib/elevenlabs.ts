// Shared ElevenLabs schemas and error handling — the canonical shapes for
// resources returned by several tools (so sibling tools describe the same
// resource the same way), plus the error path every generation tool routes
// non-2xx responses through.

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";
import { z } from "zod";

// Audio output formats accepted by the generation endpoints (vendor spec).
// text-to-speech, speech-to-speech, and text-to-dialogue accept all of these;
// sound-generation accepts everything except wav_44100.
export const SOUND_EFFECT_OUTPUT_FORMATS = [
  "mp3_22050_32",
  "mp3_44100_32",
  "mp3_44100_64",
  "mp3_44100_96",
  "mp3_44100_128",
  "mp3_44100_192",
  "pcm_16000",
  "pcm_22050",
  "pcm_24000",
  "pcm_44100",
  "ulaw_8000",
  "opus_48000_128",
] as const;
export const AUDIO_OUTPUT_FORMATS = [
  ...SOUND_EFFECT_OUTPUT_FORMATS,
  "wav_44100",
] as const;

// ElevenLabs errors use a `detail` object with a specific `code`; the legacy
// `status` field can carry the equivalent value. Live responses sometimes put
// the specific code only in `status` (e.g. a permission-restricted key returns
// code "unauthorized" with status "missing_permissions"), so hints are keyed
// on both and looked up code-first with a status fallback.
const ERROR_HINTS: Record<string, string> = {
  invalid_api_key: "the provided API key is invalid.",
  insufficient_permissions:
    "the API key lacks permission for this action — check the key's endpoint scopes.",
  missing_permissions:
    "the API key lacks the permission this endpoint needs (the error message names it) — grant it on the key in ElevenLabs Settings → API keys, or use an unrestricted key.",
  insufficient_credits:
    "the account does not have enough credits for this operation — check current usage and limits with getUserSubscription.",
  quota_exceeded:
    "the account does not have enough credits for this operation — check current usage and limits with getUserSubscription.",
  voice_not_found:
    "the specified voice ID does not exist in this account — resolve an available ID with listVoices; if the ID came from searchVoiceLibrary, add the voice with addSharedVoice first.",
  invalid_voice_id:
    "the voice ID format is invalid — pass an ID returned by listVoices (library voices from searchVoiceLibrary must be added with addSharedVoice first).",
  invalid_uid:
    "the id is malformed (often a placeholder or truncated value) — pass a real id from the resolver tools (listVoices, listHistory, searchVoiceLibrary).",
  text_too_long:
    "the text exceeds the allowed length — check maximum_text_length_per_request in listModels.",
  max_character_limit_exceeded:
    "the text exceeds the allowed length — check maximum_text_length_per_request in listModels.",
  audio_too_short:
    "the source audio is shorter than this endpoint's minimum duration — provide a longer clip (audio isolation requires roughly 5 seconds).",
  rate_limit_exceeded: "too many requests — retry with exponential backoff.",
  concurrent_limit_exceeded:
    "too many requests are running concurrently — wait for in-flight requests to finish, then retry.",
};

/**
 * Throw a ConnectorHttpError for a failed ElevenLabs response, with a
 * recovery hint when detail.code (or the legacy detail.status) is a known
 * code. The full response (status, headers, parsed body) rides on
 * error.response either way.
 */
export async function throwElevenLabsError(
  res: Response,
  label: string,
): Promise<never> {
  const body = await readResponseBody(res);
  const detail = (
    body as { detail?: { code?: string; status?: string } } | null
  )?.detail;
  const candidates =
    typeof detail === "object" ? [detail?.code, detail?.status] : [];
  const code = candidates.find(
    (value) => value !== undefined && ERROR_HINTS[value] !== undefined,
  );
  const hint = code !== undefined ? ERROR_HINTS[code] : undefined;
  throw ConnectorHttpError.fromResponseBody(res, body, {
    message:
      hint !== undefined ? `${label}: ${code} — ${hint}` : `${label} failed`,
  });
}

/**
 * POST a multipart form, translating the Zapier-managed-connection failure
 * into an actionable error. Relay only merges auth into JSON bodies and the
 * managed-connection layer only forwards string bodies, so FormData uploads
 * structurally fail in `zapier:` mode — same limitation and same handling as
 * bamboohr's uploadEmployeeFile.
 */
export async function postMultipart(
  ctx: { fetch: typeof globalThis.fetch },
  url: string,
  form: FormData,
  label: string,
): Promise<Response> {
  try {
    return await ctx.fetch(url, { method: "POST", body: form });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/only accepts `?body|zapier-mode/i.test(message)) {
      throw new Error(
        `${label}: audio uploads aren't supported over a Zapier-managed connection yet (it can't forward the multipart body). Use a direct connection for this tool — env:<VAR> naming an environment variable that holds an ElevenLabs API key.`,
      );
    }
    throw err;
  }
}

/**
 * A voice's generation settings. Appears on Voice objects (stored baseline)
 * and as the per-request `voice_settings` override input on the generation
 * tools — the override applies to that generation only.
 */
export const VoiceSettingsSchema = z
  .object({
    stability: z
      .number()
      .describe(
        "0 to 1. Lower gives a broader emotional range; higher is more monotone and consistent. Default 0.5.",
      )
      .optional(),
    similarity_boost: z
      .number()
      .describe(
        "0 to 1. How closely to adhere to the original voice. Default 0.75.",
      )
      .optional(),
    style: z
      .number()
      .describe(
        "0 to 1. Style exaggeration; nonzero values may increase latency. Default 0.",
      )
      .optional(),
    speed: z
      .number()
      .describe("Speech speed multiplier, 0.7 to 1.2. Default 1.0.")
      .optional(),
    use_speaker_boost: z
      .boolean()
      .describe(
        "Boost similarity to the original speaker; adds latency. Default true.",
      )
      .optional(),
  })
  .describe(
    "Per-request overrides of the voice's stored settings; applied to this generation only.",
  );

/**
 * Strict variant for tool inputs: a mistyped settings key fails loudly
 * instead of being silently dropped. (Outputs keep the plain object so a new
 * API field never breaks a read.)
 */
export const VoiceSettingsInputSchema = VoiceSettingsSchema.strict();

/**
 * A voice in the account — returned by listVoices (per item), getVoice, and
 * createVoiceFromDesign. Nullable-optional fields: the API omits or nulls
 * them depending on the voice's category.
 */
export const VoiceSchema = z
  .object({
    voice_id: z.string().describe("The voice's ID; pass to textToSpeech."),
    name: z
      .string()
      .describe(
        "Display name — the key for name-based disambiguation before generating with or deleting a voice.",
      ),
    category: z
      .string()
      .nullable()
      .describe("The voice category returned by ElevenLabs.")
      .optional(),
    description: z.string().nullable().optional(),
    labels: z
      .record(z.string(), z.string())
      .nullable()
      .describe("Descriptive tags, e.g. accent, gender, age, use case.")
      .optional(),
    preview_url: z
      .string()
      .nullable()
      .describe("URL of a short preview of this voice.")
      .optional(),
    is_legacy: z.boolean().nullable().optional(),
    created_at_unix: z
      .number()
      .int()
      .nullable()
      .describe("Unix timestamp (seconds) when the voice was created.")
      .optional(),
    settings: VoiceSettingsSchema.nullable()
      .describe(
        "The voice's stored generation settings — the baseline that a generation tool's voice_settings input overrides per-request.",
      )
      .optional(),
  })
  .describe("A voice in your account.");
