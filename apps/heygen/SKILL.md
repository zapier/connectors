---
name: heygen
description: Agent-callable HeyGen tools — generate AI avatar videos, translate and lip-sync videos, synthesize speech, and clone or browse voices and avatars. Use when the user mentions HeyGen or wants to create, translate, or check the status of AI videos, or to generate or clone a voice — including requests that don't name HeyGen, e.g. make an avatar video from a script, translate a video to Spanish, turn a script into a voiceover, or clone a voice from a recording.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/heygen/SKILL.md
  title: Heygen
  api-docs: https://developers.heygen.com
  zapier-app-key: HeyGenCLIAPI
---

# Heygen

<!-- BEGIN:skill-intro -->

Agent-callable tools for HeyGen's AI video platform, over the public [HeyGen v3 API](https://developers.heygen.com) (`https://api.heygen.com`). Generate AI avatar videos from a script or audio, generate short cinematic clips from a prompt, translate and lip-sync existing videos, drive the prompt-to-video Video Agent, synthesize speech, and browse the avatars and voices those jobs need. Video generation is **asynchronous**: a create tool returns an id, and you poll the matching `get*` tool until the job is `completed` and its result URLs appear.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Heygen. Not affiliated with, endorsed by, or sponsored by Heygen. "Heygen" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Create AI videos** — an avatar (or animated image) speaking a script (`createVideo`), a short prompt-driven cinematic clip (`createCinematicVideo`), or a fully agent-authored video from a text prompt (`createVideoAgentVideo`).
- **Transform existing videos** — translate into other languages (`translateVideo`) or replace the audio and re-sync the lips (`createLipsync`).
- **Synthesize speech and pick voices/avatars** — text-to-speech (`generateSpeech`), and browse/clone/design voices and browse avatar looks to resolve the ids the create tools need.
- **Track async jobs and account state** — poll a video/translation/lipsync/session by id, list past jobs, and check remaining credits (`getCurrentUser`) before generating.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill heygen` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__heygen__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Heygen API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All scripts use the single `heygen` connection. Generate tools are asynchronous — pair each with its poll tool (e.g. `createVideo` → `getVideo`).
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                                | Script name                | Connections | Description                                                                                             |
| ------------------------------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `scripts/createVideo.ts`              | `createVideo`              | heygen      | Generate an avatar or image video from a script or audio; returns a `video_id` to poll with `getVideo`. |
| `scripts/createCinematicVideo.ts`     | `createCinematicVideo`     | heygen      | Generate a short (4–15s) cinematic clip from a prompt and 1–3 avatar looks.                             |
| `scripts/getVideo.ts`                 | `getVideo`                 | heygen      | Poll a video's status and, once complete, get its result URLs (video, thumbnail, captions, share page). |
| `scripts/listVideos.ts`               | `listVideos`               | heygen      | List videos in the account, filterable by folder or title.                                              |
| `scripts/deleteVideo.ts`              | `deleteVideo`              | heygen      | Permanently delete a video and its files.                                                               |
| `scripts/generateSpeech.ts`           | `generateSpeech`           | heygen      | Synthesize speech audio from text (TTS) using a starfish-compatible voice.                              |
| `scripts/listVoices.ts`               | `listVoices`               | heygen      | List voices; filter by type, engine, language, or gender. Resolver for `voice_id`.                      |
| `scripts/designVoice.ts`              | `designVoice`              | heygen      | Generate candidate voices from a natural-language description.                                          |
| `scripts/cloneVoice.ts`               | `cloneVoice`               | heygen      | Clone a voice from a reference audio file; poll readiness with `getVoice`.                              |
| `scripts/getVoice.ts`                 | `getVoice`                 | heygen      | Get one voice's details and clone/training status by id.                                                |
| `scripts/listAvatarLooks.ts`          | `listAvatarLooks`          | heygen      | List avatar looks. Resolver for `avatar_id` (a look id is the avatar_id).                               |
| `scripts/listAvatarGroups.ts`         | `listAvatarGroups`         | heygen      | List avatar groups (each holds one or more looks).                                                      |
| `scripts/getAvatarLook.ts`            | `getAvatarLook`            | heygen      | Get one avatar look's details by look id.                                                               |
| `scripts/getAvatarGroup.ts`           | `getAvatarGroup`           | heygen      | Get one avatar group's details by group id.                                                             |
| `scripts/createAvatar.ts`             | `createAvatar`             | heygen      | Start asynchronous avatar creation from a prompt or media URLs.                                         |
| `scripts/updateAvatarLook.ts`         | `updateAvatarLook`         | heygen      | Rename an avatar look.                                                                                  |
| `scripts/translateVideo.ts`           | `translateVideo`           | heygen      | Translate a video into one or more languages; returns one id per language.                              |
| `scripts/getVideoTranslation.ts`      | `getVideoTranslation`      | heygen      | Poll a video-translation job and get the translated video URL.                                          |
| `scripts/listVideoTranslations.ts`    | `listVideoTranslations`    | heygen      | List video-translation jobs.                                                                            |
| `scripts/listTranslationLanguages.ts` | `listTranslationLanguages` | heygen      | List the languages supported for video translation.                                                     |
| `scripts/createLipsync.ts`            | `createLipsync`            | heygen      | Replace the audio on a video and re-animate the speaker's lips to match.                                |
| `scripts/getLipsync.ts`               | `getLipsync`               | heygen      | Poll a lipsync job and get the output video URL.                                                        |
| `scripts/listLipsyncs.ts`             | `listLipsyncs`             | heygen      | List lipsync jobs.                                                                                      |
| `scripts/createVideoAgentVideo.ts`    | `createVideoAgentVideo`    | heygen      | Start a Video Agent session that plans and generates a video from a prompt.                             |
| `scripts/getVideoAgentSession.ts`     | `getVideoAgentSession`     | heygen      | Get a Video Agent session's status, resulting `video_id`, and messages.                                 |
| `scripts/sendVideoAgentMessage.ts`    | `sendVideoAgentMessage`    | heygen      | Send a follow-up or revision to a chat-mode Video Agent session.                                        |
| `scripts/listVideoAgentSessions.ts`   | `listVideoAgentSessions`   | heygen      | List Video Agent sessions.                                                                              |
| `scripts/getCurrentUser.ts`           | `getCurrentUser`           | heygen      | Get the account's profile and remaining credit balance.                                                 |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

- **Resolve ids before generating; act on a single match.** The create tools take ids, not names — get an `avatar_id` from `listAvatarLooks`, a `voice_id` from `listVoices`, a `video_id` from `listVideos`. If a described avatar/voice/video has exactly one match, use it; if two or more tie on the described name/title, list the candidates with a distinguishing field (avatar type, language, created time) and ask which — don't silently pick.
- **Don't fake unsupported jobs.** This connector does **not** support: multi-scene "Studio" videos (per-scene avatars/backgrounds in one video), template-based video generation, uploading local asset files (pass a public HTTPS URL to `*_url` inputs instead), or photo-avatar/digital-twin _training_ pipelines beyond `createAvatar`'s entry point. If asked for one of these, say it isn't supported — don't substitute a different tool and report success for something you didn't do.
- **Generation is async and consumes credits.** A create call returning an id is _not_ a finished video — poll the `get*` tool until `completed`. Failed or in-progress jobs can still consume credits; `getCurrentUser` reports the remaining balance.

<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes -->

Two connection resolvers use **different credentials and bill differently**: `env:HEYGEN_API_KEY` (direct — a long-lived API key from the HeyGen dashboard, sent as `X-Api-Key`, bills the API tier) vs `zapier:<connection-id>` (Zapier-managed — routes through the connected account's OAuth credential, bills the account's web subscription plan). Both paths are verified. Read the balance field matching your auth path (`wallet` vs `subscription` — see [`references/heygen-api-gotchas.md`](references/heygen-api-gotchas.md#credits--billing-getcurrentuser)) before a generate call, to avoid an `insufficient_credit` failure mid-flow.
<!-- END:skill-auth-notes -->

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

<!-- BEGIN:skill-references-table -->

## References

| Reference                                                 | Load when                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [heygen-api-gotchas.md](references/heygen-api-gotchas.md) | Before building a HeyGen flow — async create→poll model, status enums, presigned-URL expiry, error codes, rate limits/concurrency, credits/billing, pagination, and per-domain rules (voices/TTS, avatars, cinematic, translation, lipsync, video agent). |
| [use-as-recipe.md](references/use-as-recipe.md)           | Loaded by a harness writing its own code against the vendor API (can't load the tools / run the CLI / import the package) — request patterns, response shapes, and pointers into the gotchas.                                                             |

<!-- END:skill-references-table -->
