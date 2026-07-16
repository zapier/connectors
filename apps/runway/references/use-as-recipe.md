# Using Runway when you write your own code

This is the write-your-own-code shape: you have no pre-registered tools, no
terminal/subprocess, and no way to `import` this package in-process (for
example, a code-execution sandbox that only runs snippets you author, with its
own authed HTTP path). You call the Runway API directly. If tools are already
loaded, a terminal exists, or you can import a package, use
[`use-as-mcp.md`](use-as-mcp.md), [`use-as-cli.md`](use-as-cli.md), or
[`use-as-sdk.md`](use-as-sdk.md) instead — this page teaches the request and
response shapes this connector's own scripts build and parse, so you can write
equivalent calls yourself.

## Base URL, auth, and the version header

Every call targets `https://api.dev.runwayml.com/v1` with an
`Authorization: Bearer <api-key>` header — however your sandbox is given the
key. Every request also needs Runway's own `X-Runway-Version` header (this
connector pins `2024-11-06`); what the header controls and how long an older
version keeps working is in
[`runway-api-gotchas.md`](runway-api-gotchas.md#base-url-and-the-version-header).

## The async generation envelope

Every generate/audio/recipe call below returns the same small shape — a task
id, not a finished asset:

```
{ id: string }
```

Poll `GET /tasks/{id}` with that id until the task reaches a terminal status.
The task object:

```
Task {
  id: string
  status: "PENDING" | "THROTTLED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"
  createdAt?: string          // RFC3339
  progress?: number | null    // 0-1, while RUNNING
  output?: string[] | null    // finished asset URLs, present when SUCCEEDED
  failure?: string | null     // present when FAILED
  failureCode?: string | null // present when FAILED
}
```

Only `SUCCEEDED` / `FAILED` / `CANCELLED` are terminal. What each status
means, how fast to poll, and how to branch on `failureCode` is vendor
behavior — see
[`runway-api-gotchas.md`](runway-api-gotchas.md#almost-everything-is-asynchronous--submit-then-poll)
and
[`runway-api-gotchas.md`](runway-api-gotchas.md#failure-handling--failurecode-tells-you-whether-to-retry).
`output` URLs are not durable — see
[`runway-api-gotchas.md`](runway-api-gotchas.md#output-urls-expire--download-and-rehost).

This connector's scripts also accept a convenience `wait: true` input that
polls for you and returns the resolved task fields inline. That is this
connector's own behavior, not a Runway request field — **never send `wait` on
the wire**; poll `GET /tasks/{id}` yourself instead.

## Visual generation

All of these take a free-string `model` (no default — Runway adds models
often, and the right one depends on the job) and most take an optional `seed`
(integer, 0-4294967295, for reproducibility) and an optional
`contentModeration: { publicFigureThreshold: "auto" | "low" }`. Which model
families exist today, and their accepted `ratio`/`duration` values, are vendor
facts — see
[`runway-api-gotchas.md`](runway-api-gotchas.md#models-are-chosen-per-call-and-the-roster-changes-often).

| Tool                     | Method + path          | Body (beyond `model`/`seed`/`contentModeration`)                                                                                                                                                                                    |
| ------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateImage`          | `POST /text_to_image`  | `{ promptText: string, ratio: string, referenceImages?: { uri: string, tag?: string }[] }` (1-3 reference images)                                                                                                                   |
| `generateVideoFromImage` | `POST /image_to_video` | `{ promptImage: string, promptText?: string, ratio?: string, duration?: number }`                                                                                                                                                   |
| `generateVideoFromText`  | `POST /text_to_video`  | `{ promptText: string, ratio?: string, duration?: number }`                                                                                                                                                                         |
| `editVideo`              | `POST /video_to_video` | `{ videoUri: string, promptText?: string, ratio?: string, targetAspectRatio?: "16:9"\|"4:3"\|"3:2"\|"1:1"\|"2:3"\|"3:4"\|"9:16"\|"21:9" }`                                                                                          |
| `upscaleImage`           | `POST /image_upscale`  | `{ imageUri: string }` (`model` defaults to `magnific_precision_upscaler_v2` if omitted)                                                                                                                                            |
| `upscaleVideo`           | `POST /video_upscale`  | `{ videoUri: string, resolution?: "720p"\|"1k"\|"2k"\|"4k", creativity?: number, sharpen?: number, smartGrain?: number, flavor?: "vivid"\|"natural", fpsBoost?: boolean }` (`model` defaults to `magnific_video_upscaler_creative`) |

`referenceImages`, `promptImage`, `videoUri`, and `imageUri` are HTTPS URLs or
data URIs — size caps and supported image types are vendor rules, see
[`runway-api-gotchas.md`](runway-api-gotchas.md#input-assets--url-vs-data-uri-size-limits).

**`animateCharacter` (`POST /character_performance`) nests its body** —
Runway's wire shape is `{ character: { type, uri }, reference: { type: "video", uri }, model, ratio?, bodyControl?, expressionIntensity?, seed?, contentModeration? }`,
built from the flat inputs `characterUri`, `characterType` (`"image"|"video"`,
default `"image"`), and `referenceVideoUri`:

```
{
  character: { type: characterType, uri: characterUri },
  reference: { type: "video", uri: referenceVideoUri },
  model: "act_two",                 // default
  ratio?: "1280:720" | "720:1280" | "960:960" | "1104:832" | "832:1104" | "1584:672",
  bodyControl?: boolean,             // default true
  expressionIntensity?: number,      // 1-5, default 3
  seed?: number,
  contentModeration?: { publicFigureThreshold: "auto" | "low" }
}
```

## Audio generation

| Tool                  | Method + path            | Body                                                                                                                                                                                             |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateSpeech`      | `POST /text_to_speech`   | `{ promptText: string, model: string, voice: { type: "runway-preset", presetId } \| { type: "reference-audio", audioUri }, speechRate?, loudnessRate?, pitchRate?, sampleRate?, outputFormat? }` |
| `generateSoundEffect` | `POST /sound_effect`     | `{ promptText: string, model: string, duration?: number, loop?: boolean, referenceAudios?: string[], speechRate?, loudnessRate?, pitchRate?, sampleRate?, outputFormat? }`                       |
| `convertVoice`        | `POST /speech_to_speech` | `{ media: { type: "audio"\|"video", uri }, voice: { type: "runway-preset", presetId }, model: string, removeBackgroundNoise?: boolean }`                                                         |
| `dubAudio`            | `POST /voice_dubbing`    | `{ audioUri: string, targetLang: string, model: string, disableVoiceCloning?: boolean, dropBackgroundAudio?: boolean, numSpeakers?: number }`                                                    |
| `isolateVoice`        | `POST /voice_isolation`  | `{ audioUri: string, model: string }`                                                                                                                                                            |

`voice` and `media` are discriminated objects — build them yourself from the
flat fields above (`voicePresetId` → `{ type: "runway-preset", presetId }`,
`voiceReferenceAudioUri` → `{ type: "reference-audio", audioUri }`; provide
exactly one). `sampleRate` accepts only `8000 | 16000 | 24000 | 32000 | 44100
| 48000`; `outputFormat` is `"wav" | "mp3" | "ogg_opus"`; `speechRate` /
`loudnessRate` are `-50` to `100`; `pitchRate` is `-12` to `12` (semitones).

## Marketing recipes

Higher-level, one-shot jobs. Every asset input is wrapped in a `{ uri }`
(or `{ uri, view? }`) object on the wire — a flat `xUri` field in the table
below means "send `{ uri: xUri }`". Every recipe takes a dated `version`
string (e.g. `"2026-06"`) to pin behavior, or `"unsafe-latest"`, and returns
the same async envelope as every other tool above (poll `GET /tasks/{id}`).

| Tool                     | Method + path                          | Body                                                                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localizeAd`             | `POST /recipes/ad_localization`        | `{ version, referenceImage: { uri: referenceImageUri }, targetLanguage: string }`                                                                                                                                                                              |
| `generateMarketingImage` | `POST /recipes/marketing_stock_image`  | `{ version, prompt: string, referenceImage?: { uri: brandLogoImageUri }, outputCount?: number (1-4, default 4), quality?: "low"\|"medium"\|"high" (default "high") }`                                                                                          |
| `generateMultiShotVideo` | `POST /recipes/multi_shot_video`       | `{ version, mode: "auto"\|"custom", prompt?: string (auto), shots?: { prompt, duration }[] (custom, 3-5 items), firstFrame?: { uri: firstFrameUri }, ratio?, duration?: 5\|10\|15, audio?: boolean }`                                                          |
| `generateProductAd`      | `POST /recipes/product_ad`             | `{ version, productImages: { uri }[] (1-10), styleImages?: { uri }[] (0-4), productInfo?, userConcept?, ratio?, duration?: number (4-15), audio?: boolean }`                                                                                                   |
| `generateCampaignImages` | `POST /recipes/product_campaign_image` | `{ version, image: { uri: productImageUri }, prompt: string }`                                                                                                                                                                                                 |
| `swapProduct`            | `POST /recipes/product_swap`           | `{ version, referenceVideo: { uri: referenceVideoUri }, originalProductImage: { uri: originalProductImageUri }, newProductImages: { uri, view?: "front"\|"side"\|"back" }[] (1-10), duration?: number (4-15), resolution?: "720p"\|"1080p", audio?: boolean }` |
| `generateProductUgc`     | `POST /recipes/product_ugc`            | `{ version, characterImage: { uri: characterImageUri }, productImage: { uri: productImageUri }, productInfo?, userConcept?, duration?: number (4-15), ratio?: "720:1280"\|"1080:1920", audio?: boolean }`                                                      |

`mode: "auto"` requires `prompt`; `mode: "custom"` requires `shots` (3-5
entries, each `{ prompt, duration }`, and per-shot durations must sum to the
video's total `duration`). `version` and `ratio`/`resolution` enum values are
each tool's own accepted set — send exactly the literal shown, not a
paraphrase.

## Task and account management

| Tool              | Method + path              | Body                                                             | Response                                                                                                                                                                             |
| ----------------- | -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getTask`         | `GET /tasks/{id}`          | —                                                                | `Task` (shape above)                                                                                                                                                                 |
| `cancelTask`      | `DELETE /tasks/{id}`       | —                                                                | `204 No Content` — no body; synthesize your own confirmation (e.g. `{ id, cancelled: true }`) if your code needs one                                                                 |
| `getOrganization` | `GET /organization`        | —                                                                | `{ creditBalance: number, tier?: { maxMonthlyCreditSpend?: number \| null, models?: Record<string, { maxConcurrentGenerations?: number, maxDailyGenerations?: number }> \| null } }` |
| `getCreditUsage`  | `POST /organization/usage` | `{ startDate?: string, beforeDate?: string }` (UTC `YYYY-MM-DD`) | `{ results: { date: string, usedCredits?: { model: string, amount: number }[] }[], models?: string[] \| null }`                                                                      |

`getCreditUsage` is a `POST` despite being a read — the date range rides in
the body, not the query string. Defaults and the query-window cap are vendor
behavior — see
[`runway-api-gotchas.md`](runway-api-gotchas.md#credit-usage-queries-are-windowed).

## Error handling

Two distinct "failed" shapes — don't conflate them:

- **The HTTP call itself failed.** A non-2xx response. Check the status
  before treating the body as the resource you asked for. Status-by-status
  meaning and retry-safety is vendor behavior — see
  [`runway-api-gotchas.md`](runway-api-gotchas.md#http-errors-the-request-itself-failing).
- **The call was accepted but the generation failed.** The HTTP response was
  2xx (you got a task `id`); polling later shows `status: "FAILED"` with
  `failure` (human-readable) and `failureCode` (machine-readable). Branch on
  `failureCode`, not on the presence of `failure` alone — see
  [`runway-api-gotchas.md`](runway-api-gotchas.md#failure-handling--failurecode-tells-you-whether-to-retry).

## Critical rules

Each of these is a real vendor-behavior constraint — follow the pointer
rather than trusting a restatement:

- Polling cadence, terminal statuses, and that `THROTTLED` isn't an error → [`runway-api-gotchas.md`](runway-api-gotchas.md#almost-everything-is-asynchronous--submit-then-poll)
- Output URLs expire in 24-48 hours → [`runway-api-gotchas.md`](runway-api-gotchas.md#output-urls-expire--download-and-rehost)
- `failureCode` retry semantics → [`runway-api-gotchas.md`](runway-api-gotchas.md#failure-handling--failurecode-tells-you-whether-to-retry)
- HTTP status meanings and backoff → [`runway-api-gotchas.md`](runway-api-gotchas.md#http-errors-the-request-itself-failing)
- Per-tier concurrency, daily, and spend limits → [`runway-api-gotchas.md`](runway-api-gotchas.md#rate-limits-concurrency-and-spend-caps-are-per-tier)
- Input-asset URL vs. data-URI size limits and supported types → [`runway-api-gotchas.md`](runway-api-gotchas.md#input-assets--url-vs-data-uri-size-limits)
- Content-moderation / public-figure handling → [`runway-api-gotchas.md`](runway-api-gotchas.md#content-moderation-for-public-figures)
- Credit-usage window defaults and the 90-day cap → [`runway-api-gotchas.md`](runway-api-gotchas.md#credit-usage-queries-are-windowed)
- The `X-Runway-Version` header and how long an old version keeps working → [`runway-api-gotchas.md`](runway-api-gotchas.md#base-url-and-the-version-header)
- Picking a `model` (no default, roster changes often) → [`runway-api-gotchas.md`](runway-api-gotchas.md#models-are-chosen-per-call-and-the-roster-changes-often)

## Where to go next

- [`runway-api-gotchas.md`](runway-api-gotchas.md#almost-everything-is-asynchronous--submit-then-poll) — start here if a task never finishes.
- [`runway-api-gotchas.md`](runway-api-gotchas.md#failure-handling--failurecode-tells-you-whether-to-retry) — a task reached `FAILED`.
- [`runway-api-gotchas.md`](runway-api-gotchas.md#http-errors-the-request-itself-failing) — the call itself 4xx/5xx'd.
- [`runway-api-gotchas.md`](runway-api-gotchas.md#rate-limits-concurrency-and-spend-caps-are-per-tier) — you need tier/model limits.
- [`runway-api-gotchas.md`](runway-api-gotchas.md#input-assets--url-vs-data-uri-size-limits) — an asset upload was rejected.
