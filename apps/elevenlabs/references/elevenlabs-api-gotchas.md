# ElevenLabs API gotchas

Load this reference when choosing IDs or models, paginating results, handling
audio, or recovering from an ElevenLabs API error.

## Authentication and errors

- ElevenLabs authenticates API requests with the `xi-api-key` header. API keys
  can be restricted by endpoint scope, credit quota, and IP allowlist. Keep the
  key server-side. [Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- Error responses use standard HTTP status codes and include a JSON `detail`
  object. Prefer `detail.code` for programmatic handling; `detail.status` is a
  legacy field. Preserve `detail.request_id` when escalating an unresolved
  error. [Errors](https://elevenlabs.io/docs/eleven-api/resources/errors)
- Some live responses still carry the specific code only in the legacy
  `detail.status` field with a generic `detail.code`: observed examples are a
  permission-restricted key returning 401 with `code: "unauthorized"` /
  `status: "missing_permissions"`, and a malformed resource id returning
  `code: "bad_request"` / `status: "invalid_uid"`. Check both fields when
  matching error codes.
- HTTP 429 can mean either endpoint rate limiting
  (`rate_limit_exceeded`) or excess concurrent requests
  (`concurrent_limit_exceeded`). Use exponential backoff for rate limiting;
  wait for in-flight requests to finish for concurrency errors.
  [Errors](https://elevenlabs.io/docs/eleven-api/resources/errors#rate-limiting-and-concurrency)

## Resolve IDs and capabilities first

- Use `listVoices` for voices already available to the account. Search covers
  name, description, labels, and category. Paginate with `has_more` and
  `next_page_token`; do not use `total_count` as the pagination condition
  because it is a live snapshot.
  [List voices](https://elevenlabs.io/docs/api-reference/voices/search)
- `searchVoiceLibrary` returns shared-library voices. A shared voice is not
  added to the account until `addSharedVoice` is called with its
  `public_owner_id` and `voice_id`.
  [List shared voices](https://elevenlabs.io/docs/api-reference/voices/voice-library/get-shared)
  [Add shared voice](https://elevenlabs.io/docs/api-reference/voices/voice-library/share)
- Use `listModels` rather than hard-coding model capabilities. Each model can
  report `can_do_text_to_speech`, `can_do_voice_conversion`, supported
  languages, and `maximum_text_length_per_request`.
  [List models](https://elevenlabs.io/docs/api-reference/models/list)

## Speech and audio generation

- `textToSpeech` requires text and a voice ID. The default model is
  `eleven_multilingual_v2`. `language_code` is ISO 639-1; unsupported language
  enforcement is ignored, and it is not supported by `multilingual_v2`.
  [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- `voice_settings` overrides the selected voice's stored settings for that
  request only. `seed` is best-effort deterministic sampling in the range
  0–4294967295; identical inputs are not guaranteed to produce identical
  audio.
  [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- Audio output formats use `codec_sample_rate_bitrate`, with
  `mp3_44100_128` as the default. MP3 at 192 kbps requires Creator or above;
  44.1 kHz PCM and WAV require Pro or above.
  [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- `speechToSpeech` transforms source audio while retaining control over
  emotion, timing, and delivery. Its model must support voice conversion.
  `remove_background_noise` runs the input through the audio-isolation model.
  [Voice changer](https://elevenlabs.io/docs/api-reference/speech-to-speech/convert)
- `textToDialogue` accepts ordered text/voice-ID pairs. It allows at most 10
  unique voice IDs; keep the combined text at or below 2,000 characters for
  reliable generation. Longer requests can fail validation or terminate
  early. Unsupported `language_code` values are ignored.
  [Create dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
- `createSoundEffect` accepts durations from 0.5 through 30 seconds. Omit the
  duration to let the service infer it. `prompt_influence` ranges from 0 to 1
  and defaults to 0.3; higher values follow the prompt more closely and reduce
  variation. Looping is available for the `eleven_text_to_sound_v2` model.
  [Create sound effect](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
- `isolateAudio` removes background noise from uploaded audio. The source
  must be at least ~5 seconds long; shorter clips are rejected.
  [Audio isolation](https://elevenlabs.io/docs/api-reference/audio-isolation/convert)

## Audio in and out

- Audio-producing tools write the generated audio to a temp file and return
  `audio_path` by default; pass `return_base64: true` to get `audio_base64`
  inline instead (large payloads — only for consumers without filesystem
  access).
- Audio-consuming tools (`speechToSpeech`, `isolateAudio`) take exactly one
  of `audio_url` (HTTPS, downloaded then uploaded) or `audio_path` (local
  file). Chain another tool's `audio_path` output straight into `audio_path`.
- Billing differs by surface: text generation (speech, dialogue, sound
  effects) is billed per character; audio transformation (`speechToSpeech`,
  `isolateAudio`) and transcription are billed by audio duration.
- `textToDialogue` is built for the `eleven_v3` model, which not every
  account can access — confirm it appears in `listModels` before generating.

- Generation endpoints return metadata in response headers, not the body:
  `history-item-id` (the generation's ID in history — chain it into
  `downloadHistoryAudio` or `getHistoryItem`), `request-id` (quote when
  escalating an error), and `character-cost` (credits the request consumed).
  Audio-producing tools surface `history-item-id` as `history_item_id` in
  their output; some endpoints (e.g. sound effects) may omit it.
  [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)

## Transcription

- `speechToText` accepts a hosted audio or video URL, including supported video
  hosting services. Supplying an ISO 639-1 or ISO 639-3 `language_code` can
  improve transcription when the language is known; omit it for automatic
  detection.
  [Create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- Speaker diarization is off by default. `num_speakers` can help diarization
  and has a maximum of 32. Audio-event tagging is on by default and can emit
  events such as laughter or footsteps.
  [Create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- Transcript word entries can be `word`, `spacing`, or `audio_event`; timing
  values are in seconds. Detected output language codes can be three-letter
  values such as `eng`.
  [Create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)

## Voice design and history

- `designVoice` previews carry inline base64 audio on the wire; the connector
  writes each preview to a file and returns an `audio_path` per preview (plus
  its `generated_voice_id`) unless `return_base64` is set. Preview text must
  be 100–1,000 characters when supplied; otherwise `auto_generate_text` can
  generate it.
  [Design a voice](https://elevenlabs.io/docs/api-reference/text-to-voice/design)
- Save the selected preview with `createVoiceFromDesign`; it requires the
  preview's `generated_voice_id`, a name, and a description.
  [Create a voice](https://elevenlabs.io/docs/api-reference/text-to-voice/create)
- `listHistory` is newest-first when no cursor is supplied. Continue with
  `last_history_item_id` as `start_after_history_item_id` while `has_more` is
  true. The API allows up to 1,000 items per page. A `model_id` filter also
  requires `source`.
  [Get generated items](https://elevenlabs.io/docs/api-reference/history/list)
- `downloadHistoryAudio` returns the binary audio for one history item.
  `deleteHistoryItem` deletes an item by ID.
  [Get audio from history item](https://elevenlabs.io/docs/api-reference/history/get-audio)
  [Delete history item](https://elevenlabs.io/docs/api-reference/history/delete)
