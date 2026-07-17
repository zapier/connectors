# HeyGen — reference implementation (recipe)

For a harness that **writes its own code** against the HeyGen API and can't load these tools, run the CLI, or import the package in-process (e.g. a sandboxed `execute_snippet` surface). It assumes you have your **own authed HTTP path** to HeyGen. If the tools are already callable or you have a terminal, use [`use-as-mcp.md`](./use-as-mcp.md), [`use-as-cli.md`](./use-as-cli.md), or [`use-as-sdk.md`](./use-as-sdk.md) instead.

This file gives request/response **shapes and patterns** (mechanism). It does **not** restate vendor rules — those live once in [`heygen-api-gotchas.md`](./heygen-api-gotchas.md); pointers below.

## Transport

- Base URL `https://api.heygen.com`; every request carries your HeyGen API key in the `X-Api-Key` header (auth details → gotchas § Base URL & versioning). Express it as _your authed request to `<endpoint>`_.
- **Single-object responses** are enveloped as `{ "data": { … } }` — read `.data`.
- **List responses** are `{ "data": [ … ], "has_more": bool, "next_token": string | null }`.
- **Errors** are non-`2xx` with body `{ "error": { "code", "message", "doc_url", "param"? } }`. `2xx` is always success (no wrapped-error case). Recover by `code` — see gotchas § Error envelope; don't restate the codes here.

## Core pattern: create → poll → download

Generation endpoints return an **id + initial status**, never a finished asset. Then poll the matching `get` endpoint until the status is terminal, and read the (presigned, expiring) result URLs. See gotchas § Generation is asynchronous.

```
POST  /v3/videos            → { data: { video_id, status } }     # status starts "waiting"
GET   /v3/videos/{video_id} → { data: { status, video_url, … } } # url present only when status == "completed"
```

## Per-tool request patterns

Endpoints, methods, and input fields below are read from the connector's public `scripts/*.ts`. Response shapes are **structural** (the id/status/url fields a follow-up needs), not full mirrors of the output schema, and carry no example server values.

### Videos

```
POST /v3/videos
  body: { type: "avatar" | "image", avatar_id?, image_url?, image_asset_id?,
          script?, voice_id?, audio_url?, voice_settings?, title?,
          resolution?: "720p"|"1080p", aspect_ratio?: "16:9"|"9:16"|"1:1",
          fit?, background?, caption?, remove_background?, motion_prompt?,
          expressiveness?, callback_url?, callback_id? }
  → { data: { video_id, status } }

# Cinematic Avatar is the same endpoint with a prompt + 1–3 look ids (flat-priced; see gotchas):
POST /v3/videos
  body: { prompt, avatar_id: string[1..3], aspect_ratio?, resolution?,
          duration?: 4..15, auto_duration?, enhance_prompt?, callback_url? }
  → { data: { video_id, status } }

GET    /v3/videos/{video_id}   → { data: { id, status, video_url, thumbnail_url, gif_url,
                                            captioned_video_url, subtitle_url, video_page_url,
                                            duration, failure_code?, failure_message? } }
GET    /v3/videos?limit=&token=&title=&folder_id=
                               → { data: [ { id, status, … } ], has_more, next_token }
DELETE /v3/videos/{video_id}   → { data: { video_id } }
```

### Voices, TTS, cloning

```
POST /v3/voices/speech   body: { text (1–5000), voice_id, input_type?: "text"|"ssml",
                                 speed?: 0.5..2.0, language?, locale? }
                         → { data: { audio_url, duration } }        # audio_url presigned, expires
GET  /v3/voices?limit=&token=&type=&engine=&language=&gender=
                         → { data: [ { voice_id, name, language, gender, engine,
                                       support_pause, support_locale } ], has_more, next_token }
GET  /v3/voices/{voice_id}       → { data: { voice_id, name, engine, support_pause, support_locale, status } }
POST /v3/voices/clone    body: { voice_name, audio_url, language?, remove_noise? }
                         → { data: { voice_clone_id, status } }     # poll GET /v3/voices/{voice_clone_id} until "complete"
POST /v3/voices          body: { prompt, gender?, locale?, seed? }  # design a voice
                         → { data: [ { voice_id, name, … } ] }       # up to 3, ordered by relevance
```

For TTS you must pick a **Starfish-compatible** voice (`engine=starfish`) — gotchas § Voices & text-to-speech.

### Avatars

```
POST  /v3/avatars              body: { type: "prompt"|"photo"|"digital_twin", name?, prompt?,
                                       image_url?, video_url?, consent_video_url? }
                               → { data: { avatar_item: { id, name, avatar_type, status, … } } }  # trains async
GET   /v3/avatars              → { data: [ { id (group_id), name, looks_count, status } ], has_more, next_token }
GET   /v3/avatars/{group_id}   → { data: { id, name, looks_count, status } }
GET   /v3/avatars/looks?group_id=&type=&limit=&token=
                               → { data: [ { id (=avatar_id), status, default_voice_id } ], has_more, next_token }
GET   /v3/avatars/looks/{look_id}   → { data: { id, status, default_voice_id } }
PATCH /v3/avatars/looks/{look_id}   body: { name }   → { data: { id, name } }
```

A **look** `id` is the `avatar_id` you pass to video creation — not the group id. See gotchas § Avatars.

### Translation, lipsync, video agent

```
POST /v3/video-translations   body: { video_url XOR video_asset_id, output_languages: string[],
                                       title?, mode?: "speed"|"precision", input_language?,
                                       audio_only?, caption?, callback_url? }
                              → { data: { video_translation_ids: string[] } }   # one id per language
GET  /v3/video-translations/{id}          → { data: { id, status, video_url, caption_url } }
GET  /v3/video-translations/languages     → { data: [ … supported language values … ] }  # pass exact values

POST /v3/lipsyncs   body: { video_url|video_asset_id, audio_url|audio_asset_id, mode?: "speed"|"precision",
                            caption?, start?, end?, title?, callback_url? }
                    → { data: { lipsync_id, status } }
GET  /v3/lipsyncs/{lipsync_id}   → { data: { id, status, video_url, caption_url } }

POST /v3/video-agents   body: { prompt (1–10000), mode?: "generate"|"chat", avatar_id?, voice_id?,
                                style_id?, orientation?: "landscape"|"portrait", callback_url? }
                        → { data: { session_id, status, created_at } }
GET  /v3/video-agents/{session_id}   → { data: { session_id, status, progress, video_id } }  # getVideo once video_id set
POST /v3/video-agents/{session_id}   body: { message, avatar_id?, voice_id? }  # chat-mode revisions only
                        → { data: { run_id } }
```

`output_languages` values must come from the languages endpoint; translation clones the speaker's voice by default — gotchas § Video translation. Only a `chat` session accepts follow-up messages — gotchas § Video Agent.

### Account

```
GET /v3/users/me   → { data: { username, email, billing_type, wallet?, subscription?, usage_based? } }
```

Check credits before an expensive generate to avoid `insufficient_credit` — gotchas § Credits & billing.

## Critical rules (one home each — see the gotchas)

- **Poll, don't block** on generate; results appear only at `completed`. → gotchas § Generation is asynchronous
- **Result URLs expire** (presigned) — download promptly. → gotchas § Result URLs are presigned and expire
- **Handle `429`** with the `Retry-After` header; mind the concurrency cap. → gotchas § Rate limits & concurrency
- **TTS needs a Starfish voice.** → gotchas § Voices & text-to-speech
- **Translate to exact language values** from the languages endpoint. → gotchas § Video translation
- **Paginate** with `token` → `next_token`/`has_more`. → gotchas § Pagination
