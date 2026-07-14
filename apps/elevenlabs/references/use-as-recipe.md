# Using Elevenlabs as a recipe (write-your-own-code shape)

This is the write-your-own-code shape: you have no pre-registered tools, no
terminal or subprocess access, and no way to `import` this package in-process
(for example, a code-execution sandbox that runs a snippet you write against
the open web). This reference teaches you enough about the ElevenLabs API's
request/response shapes to write equivalent calls yourself, without relying
on this connector's own code at runtime.

## Auth and base URL

Every call below goes to `https://api.elevenlabs.io`. Authenticate each
request the way this connector's own calls do — see
[gotchas#authentication-and-errors](elevenlabs-api-gotchas.md#authentication-and-errors)
for the exact header and how API keys can be scoped. Get a key from your own
ElevenLabs account; there is no Zapier-specific auth step in this shape.

## Error-handling pattern

The mechanism is the same for every call:

1. Make the request; check the HTTP status.
2. On a non-2xx status, parse the JSON response body — it carries a `detail`
   object describing the failure. Surface `detail` (and the HTTP status) to
   whatever is driving you; don't swallow it.
3. On success, most endpoints return a JSON body directly. A subset of
   endpoints (see "Speech and audio generation" and "Audio transformation and
   transcription" below) return raw audio bytes as the body instead, with
   extra generation metadata carried in response headers rather than in the
   body.

For what the `detail` fields mean, which HTTP codes are retryable, and which
response headers carry generation metadata, see
[gotchas#authentication-and-errors](elevenlabs-api-gotchas.md#authentication-and-errors)
and
[gotchas#audio-in-and-out](elevenlabs-api-gotchas.md#audio-in-and-out) — those
specifics are vendor behavior, not restated here.

## Request/response shape patterns per operation family

Types below are structural (field name + type) only. Where a field has a
specific allowed set of values, a numeric range, or a default, that's vendor
behavior — resolve it from `listModels`/`listVoices` at runtime or look it up
in the gotchas doc; don't hard-code a value you saw once.

### Voice resolution and management

| Call                              | Method + path                                      | Request shape                                                                                                                                                          | Response shape                                                                                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List account voices               | `GET /v2/voices`                                   | query: `search?: string`, `category?: string`, `page_size?: integer`, `next_page_token?: string`                                                                       | `{ voices: Voice[], has_more: boolean, next_page_token?: string \| null, total_count?: integer \| null }`                                                                                                                                      |
| Get one voice                     | `GET /v1/voices/{voice_id}`                        | path param `voice_id: string`                                                                                                                                          | `Voice` object (id, name, stored settings, preview URL, …)                                                                                                                                                                                     |
| Search the shared library         | `GET /v1/shared-voices`                            | query: `search?, language?, gender?, age?, accent?, use_cases?: string`, `page_size?: integer`, `page?: integer`                                                       | `{ voices: LibraryVoice[], has_more: boolean }` — each `LibraryVoice` carries its own `public_owner_id` + `voice_id` (not the same as an account voice_id)                                                                                     |
| Add a shared voice to the account | `POST /v1/voices/add/{public_owner_id}/{voice_id}` | JSON body: `{ new_name?: string }`                                                                                                                                     | `{ voice_id: string }` — the new account-scoped id                                                                                                                                                                                             |
| Delete a voice                    | `DELETE /v1/voices/{voice_id}`                     | path param `voice_id: string`                                                                                                                                          | `{ status: string }`                                                                                                                                                                                                                           |
| Design a voice from a description | `POST /v1/text-to-voice/design`                    | JSON body: `{ voice_description: string, text?: string, auto_generate_text?: boolean, model_id?: string, loudness?: number, guidance_scale?: number, seed?: integer }` | `{ previews: [{ generated_voice_id: string, audio_base_64: string, media_type: string, duration_secs: number, language: string }], text: string }` — preview audio arrives inline as base64 in the JSON, unlike the generation endpoints below |
| Save a designed voice             | `POST /v1/text-to-voice`                           | JSON body: `{ voice_name: string, voice_description: string, generated_voice_id: string, labels?: Record<string, string> }`                                            | `Voice` object                                                                                                                                                                                                                                 |

### Models

| Call        | Method + path    | Request shape | Response shape                                                                                                                                                                                                                            |
| ----------- | ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List models | `GET /v1/models` | none          | array of `{ model_id: string, name: string, description?: string, can_do_text_to_speech?: boolean, can_do_voice_conversion?: boolean, languages?: [{ language_id?: string, name?: string }], maximum_text_length_per_request?: integer }` |

Resolve `model_id` and its capability/limit fields from this call rather than
assuming a model name works for a given operation.

### Speech and audio generation (JSON in, audio bytes out)

These three all take a JSON body plus an `output_format` query parameter, and
return the audio as the raw response body (not JSON) with metadata in
headers per the error-handling pattern above.

| Call                  | Method + path                                              | Request shape                                                                                                            |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Text to speech        | `POST /v1/text-to-speech/{voice_id}` (+ `?output_format=`) | JSON body: `{ text: string, model_id?: string, language_code?: string, voice_settings?: object, seed?: integer }`        |
| Create a sound effect | `POST /v1/sound-generation` (+ `?output_format=`)          | JSON body: `{ text: string, duration_seconds?: number, prompt_influence?: number, loop?: boolean }`                      |
| Text to dialogue      | `POST /v1/text-to-dialogue` (+ `?output_format=`)          | JSON body: `{ inputs: [{ text: string, voice_id: string }], model_id?: string, language_code?: string, seed?: integer }` |

Build the JSON body incrementally — include an optional key only when you
have a value for it, rather than sending `null`/`undefined` placeholders.

### Audio transformation and transcription (multipart in)

These take the source audio (or its URL) as a `multipart/form-data` body
instead of JSON. Append scalar fields to the form as strings; let your HTTP
client set the multipart boundary itself rather than setting a
`Content-Type` header by hand.

| Call                      | Method + path                                                | Form fields                                                                                                                                     | Response shape                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Re-voice existing speech  | `POST /v1/speech-to-speech/{voice_id}` (+ `?output_format=`) | `audio` (binary), `model_id: string`, `voice_settings?: string` (JSON-encoded), `remove_background_noise: boolean`, `seed?: integer`            | raw audio bytes + headers                                                                                                                                                      |
| Isolate/clean up audio    | `POST /v1/audio-isolation`                                   | `audio` (binary)                                                                                                                                | raw audio bytes + headers                                                                                                                                                      |
| Transcribe audio or video | `POST /v1/speech-to-text`                                    | `source_url: string`, `model_id: string`, `language_code?: string`, `diarize?: boolean`, `num_speakers?: integer`, `tag_audio_events?: boolean` | JSON: `{ language_code?: string, language_probability?: number, text: string, words?: [{ text?: string, type?: string, start?: number, end?: number, speaker_id?: string }] }` |

Note `speechToText`'s response is JSON (unlike the other two in this family,
which return raw audio) — don't assume every multipart-in call is
audio-out.

### History and account

| Call                            | Method + path                             | Request shape                                                                                                                                                                    | Response shape                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| List generation history         | `GET /v1/history`                         | query: `page_size?: integer`, `start_after_history_item_id?: string`, `voice_id?, model_id?, search?: string`, `source?: string`, `date_after_unix?, date_before_unix?: integer` | `{ history: HistoryItem[], has_more: boolean, last_history_item_id?: string \| null }`                                                                                                                                                                                                                                               |
| Get one history item            | `GET /v1/history/{history_item_id}`       | path param                                                                                                                                                                       | `HistoryItem` (id, request id, voice/model ids, source text, timestamps, content type, state, character-count deltas)                                                                                                                                                                                                                |
| Download a history item's audio | `GET /v1/history/{history_item_id}/audio` | path param                                                                                                                                                                       | raw audio bytes (no generation-metadata headers — the id is already known, it's the input)                                                                                                                                                                                                                                           |
| Delete a history item           | `DELETE /v1/history/{history_item_id}`    | path param                                                                                                                                                                       | `{ status: string }`                                                                                                                                                                                                                                                                                                                 |
| Get subscription/quota          | `GET /v1/user/subscription`               | none                                                                                                                                                                             | `{ tier: string, character_count: integer, character_limit: integer, next_character_count_reset_unix?: integer \| null, status: string, billing_period?: string \| null, voice_slots_used?: integer \| null, voice_limit?: integer \| null, can_use_instant_voice_cloning?: boolean, can_use_professional_voice_cloning?: boolean }` |

`model_id` as a history filter also requires `source` — same shape as
`listHistory`'s own request logic.

## Critical rules

Everything below is a fact about how the ElevenLabs API actually behaves,
not just its shape — each one is covered in the gotchas doc, not repeated
here:

- Auth header mechanics and error-code semantics (including the 429
  rate-limit-vs-concurrency distinction) —
  [gotchas#authentication-and-errors](elevenlabs-api-gotchas.md#authentication-and-errors)
- Resolving voice, shared-library, and model IDs/capabilities before use, and
  correct pagination —
  [gotchas#resolve-ids-and-capabilities-first](elevenlabs-api-gotchas.md#resolve-ids-and-capabilities-first)
- Defaults, limits, and tier gates for text-to-speech, sound effects, text
  to dialogue, speech-to-speech, and audio isolation —
  [gotchas#speech-and-audio-generation](elevenlabs-api-gotchas.md#speech-and-audio-generation)
- Which response headers carry generation metadata, and model-access gating
  for dialogue —
  [gotchas#audio-in-and-out](elevenlabs-api-gotchas.md#audio-in-and-out)
- Transcription language handling, diarization, and event tagging —
  [gotchas#transcription](elevenlabs-api-gotchas.md#transcription)
- Voice-design text-length rules and history pagination/ordering —
  [gotchas#voice-design-and-history](elevenlabs-api-gotchas.md#voice-design-and-history)

## Where to go next

- [ElevenLabs API gotchas — Authentication and errors](elevenlabs-api-gotchas.md#authentication-and-errors)
- [ElevenLabs API gotchas — Resolve IDs and capabilities first](elevenlabs-api-gotchas.md#resolve-ids-and-capabilities-first)
- [ElevenLabs API gotchas — Speech and audio generation](elevenlabs-api-gotchas.md#speech-and-audio-generation)
- [ElevenLabs API gotchas — Audio in and out](elevenlabs-api-gotchas.md#audio-in-and-out)
- [ElevenLabs API gotchas — Transcription](elevenlabs-api-gotchas.md#transcription)
- [ElevenLabs API gotchas — Voice design and history](elevenlabs-api-gotchas.md#voice-design-and-history)
