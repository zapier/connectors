# HeyGen API — gotchas

Non-obvious behavior of the HeyGen API that the tool descriptions can't fully carry. Every claim here is sourced from HeyGen's public developer docs (linked inline).

## Base URL & versioning

- Base URL for all endpoints is `https://api.heygen.com`; requests authenticate via the **`X-Api-Key`** header. ([API Key](https://developers.heygen.com/docs/api-key))
- This connector targets the **v3** API (`/v3/...`). HeyGen's new feature development is focused on v3; the older `/v1` and `/v2` endpoints "remain fully operational and supported through **October 31, 2026**." ([v3 migration guide](https://docs.heygen.com/reference/create-video-1))

## Error envelope

Errors are returned as an envelope with a machine-readable `code`, a human-readable `message`, a `doc_url`, and (for validation errors) an optional `param`:

```json
{
  "error": {
    "code": "insufficient_credit",
    "message": "…",
    "doc_url": "…",
    "param": null
  }
}
```

Success is signaled by HTTP status: **"Codes in the `2xx` range indicate success."** A `2xx` does not carry an `error` body — so unlike some vendors, a `200` here is genuinely success, not a wrapped failure. ([Error Codes](https://developers.heygen.com/docs/error-codes))

Common `code` values worth handling ([Error Codes](https://developers.heygen.com/docs/error-codes)):

| `code`                                                     | Meaning                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `insufficient_credit`                                      | Account doesn't have enough credits to complete this request.                    |
| `quota_exceeded`                                           | A usage quota was exceeded.                                                      |
| `trial_limit_exceeded`                                     | Trial-account video-generation limit reached.                                    |
| `plan_upgrade_required`                                    | The requested feature needs a higher subscription tier.                          |
| `invalid_parameter`                                        | One or more request parameters are invalid, missing, or malformed (see `param`). |
| `rate_limit_exceeded`                                      | Requests are being sent too frequently.                                          |
| `resource_not_found`                                       | Generic not-found for resources without a specific code.                         |
| `video_not_found` / `avatar_not_found` / `voice_not_found` | No video / avatar / voice matched the provided ID.                               |

## Rate limits & concurrency

- "All endpoints enforce rate limits. When exceeded, the API returns **`429 Too Many Requests`** with a **`Retry-After`** header indicating the number of seconds to wait before retrying." ([Usage Limits](https://developers.heygen.com/docs/usage-limits))
- There is also a **concurrency cap** on in-flight async jobs (e.g. 10 concurrent for Pay-As-You-Go). "Concurrent jobs include any asynchronous generation in progress: Video Agent sessions, avatar video renders, and video translations." Exceeding it also returns `429` with `Retry-After`. ([Usage Limits](https://developers.heygen.com/docs/usage-limits))

## Generation is asynchronous — create, then poll

Every generate call returns an **id and an initial status**, not a finished asset. Poll the matching `get*` tool until the status is terminal (`completed`/`failed`), then read the result URLs — they are populated **only when `completed`**.

Status vocab differs by resource (source each before asserting one):

- **Video** (`getVideo`): `pending`, `processing`, `completed`, `failed`; a freshly created video starts at `waiting`. ([Create Video](https://developers.heygen.com/reference/create-video), [Get Video](https://developers.heygen.com/reference/get-video))
- **Lipsync** (`getLipsync`) and **video translation** (`getVideoTranslation`): `pending`, `running`, `completed`, `failed`. ([Get Lipsync](https://developers.heygen.com/reference/get-lipsync))
- **Avatar training** (`getAvatarLook`/`getAvatarGroup`): `processing`, `pending_consent`, `failed`, `completed`. ([Create Avatar](https://developers.heygen.com/reference/create-avatar))

For a failed **video**, the reason is on `failure_code` / `failure_message`, which are "Only present when status is failed." ([Get Video](https://developers.heygen.com/reference/get-video))

### Result URLs are presigned and expire

`video_url`, `caption_url`, audio URLs, etc. are **presigned download URLs** — they expire, so download promptly rather than storing the URL. ([Get Video](https://developers.heygen.com/reference/get-video): "Presigned URL to download the video file"; [Get Lipsync](https://developers.heygen.com/reference/get-lipsync): "Presigned download URL … Only present when status is completed.")

### Callbacks as an alternative to polling

Generate calls accept a `callback_url` — "Webhook URL to receive a POST notification when the video is ready" — plus an optional `callback_id` echoed back to correlate the event. ([Create Video](https://developers.heygen.com/reference/create-video), [Webhooks](https://developers.heygen.com/docs/webhooks))

## Credits & billing (`getCurrentUser`)

Check the account balance before an expensive generate call to avoid an `insufficient_credit` failure mid-flow. The account's `billing_type` is **exactly one of** `wallet`, `subscription`, or `usage_based`, and the balance lives in the matching object:

- `wallet` — prepaid balance in USD (`remaining_balance`); API-key auth.
- `subscription` — per-pool credits (`premium_credits`, `add_on_credits`, each with `remaining` / `resets_at`); OAuth integration apps.
- `usage_based` — `spending_current_usd`, `spending_cap_usd`, `included_credits`, `remaining_credits`.

([Get Current User](https://developers.heygen.com/reference/get-current-user))

## Pagination (cursor-based)

List endpoints are cursor-paginated: pass the **`token`** query parameter, and the response returns **`next_token`** and **`has_more`**. "If `has_more` is `true`, pass the `next_token` value as the `token` query parameter to fetch the next page." The page-size parameter is **`limit`**; its cap and default vary by endpoint (e.g. list-videos accepts `1–100`, default `10`; avatar/voice lists default `20`). ([Avatars pagination](https://developers.heygen.com/docs/avatars), [List Videos](https://developers.heygen.com/reference/list-videos))

## Voices & text-to-speech

- **Engine matters for TTS.** `generateSpeech` (`POST /v3/voices/speech`) requires a **Starfish-compatible** voice: "Starfish only works with Starfish-compatible voices. Not all HeyGen voices support this engine." To find eligible voices, filter `listVoices` by `engine=starfish`. ([Text to Speech](https://developers.heygen.com/docs/voices/speech), [Browse Voices](https://developers.heygen.com/docs/voices/search-voices))
- **TTS input limits:** text is `1–5,000 characters`; the `speed` multiplier is `0.5–2.0`. For pauses/emphasis, set `input_type` to `"ssml"` — but SSML `<break>` tags only work when the voice's **`support_pause`** flag is true. ([Text to Speech](https://developers.heygen.com/docs/voices/speech))
- **Voice capability flags:** `support_pause` = "Whether the voice supports SSML pause/break tags"; `support_locale` = "Whether the voice supports locale variants (e.g. `en-US` vs `en-GB`)." ([Browse Voices](https://developers.heygen.com/docs/voices/search-voices))

### Cloning a voice is async

`cloneVoice` (`POST /v3/voices/clone`) returns a **`voice_clone_id`** that must be polled — "polled via `GET /v3/voices/{voice_clone_id}` until the status is 'complete'" — before it's usable as a `voice_id`. The `language` hint is "auto-detected if omitted." ([Clone a Voice](https://developers.heygen.com/reference/clone-a-voice))

### Designing a voice returns a small batch

`designVoice` (`POST /v3/voices`) returns "up to 3 matching voices, ordered by relevance." Increment `seed` to get the next batch — "same prompt, different voices" — and "same prompt + seed always returns the same voices." ([Design a Voice](https://developers.heygen.com/docs/voices/design-voices))

## Avatars

- Avatar creation is **asynchronous**: "Avatar training is asynchronous." Poll `getAvatarLook` / `getAvatarGroup` until the look's status is `completed`. ([Create Avatar](https://developers.heygen.com/reference/create-avatar))
- Input modes are `prompt` (AI-generated), `photo`, and `digital_twin` (from video footage). A digital twin can require a consent video — the look sits at `pending_consent` until consent clears. ([Create Avatar](https://developers.heygen.com/reference/create-avatar), [Avatar Consent](https://developers.heygen.com/docs/avatar-consent))
- **A "look" id is the `avatar_id`** you pass to `createVideo` — not the group id. Resolve looks via `listAvatarLooks` (groups via `listAvatarGroups` hold one or more looks).

## Video generation & the Cinematic Avatar

- Standard video generation is `POST /v3/videos` with `type=avatar` (a look speaking a script) or `type=image` (an animated still). Avatar IV is "the default HeyGen v3 rendering engine" and adds `motion_prompt` and expressiveness control. ([Avatar IV](https://developers.heygen.com/avatar-iv))
- **Cinematic Avatar is flat-priced, not per-second.** It is billed at a "Flat rate per video (4–15 seconds, 720p/1080p only), **not billed by duration**" (≈ `$7.00 / video` at time of writing). Most other generation is per-second (e.g. Starfish TTS `$0.000667/sec`, translation `$0.0333/sec` speed). Pricing changes — treat exact rates as indicative and re-check. ([Self-Serve Pricing](https://developers.heygen.com/docs/pricing))

## Video translation

- **Use exact language values.** Fetch target languages via `GET /v3/video-translations/languages` (`listTranslationLanguages`) and pass those exact values — the API supports `175+` languages. ([Video Translation](https://developers.heygen.com/docs/video-translate), [List Supported Languages](https://developers.heygen.com/reference/list-supported-translation-languages))
- **One id per language.** `output_languages` is an array; the response "returns one ID per language" (`video_translation_ids[]`) — poll each with `getVideoTranslation`. ([Create Video Translation](https://developers.heygen.com/reference/create-video-translation))
- Provide the source as **either** `video_url` **or** `video_asset_id` (mutually exclusive, `oneOf`). ([Create Video Translation](https://developers.heygen.com/reference/create-video-translation))
- Translation **clones the original speaker's voice by default** so the output "sounds like them"; audio-only mode skips lip-sync. Speed vs. precision trades latency for fidelity. ([Video Translation](https://developers.heygen.com/docs/video-translate))

## Lipsync

`createLipsync` (`POST /v3/lipsyncs`) replaces a video's audio and re-animates the mouth. One engine runs in two modes — "**Speed** and **Precision** — trading latency for fidelity": speed for rapid drafts/batches, precision for higher accuracy. ([Lipsync — Speed](https://developers.heygen.com/lipsync-speed))

## Video Agent

`createVideoAgentVideo` (`POST /v3/video-agents`) drives a prompt-to-video agent. The `mode` is `generate` (default) — "one-shot — auto-proceeds through storyboard, produces one video" — or `chat` — "multi-turn — may pause for user input …, allows revisions and follow-up videos." Only a `chat` session accepts follow-ups via `sendVideoAgentMessage`. Poll `getVideoAgentSession`; once its `video_id` is set, fetch the finished video with `getVideo`. The prompt is `1–10000` characters. ([Create Video Agent Session](https://developers.heygen.com/reference/create-video-agent-session), [Video Agent Overview](https://developers.heygen.com/docs/overview))
