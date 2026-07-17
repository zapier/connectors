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

_Independent, unofficial connector for Heygen. Not affiliated with, endorsed by, or sponsored by Heygen. "Heygen" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for HeyGen's AI video platform, over the public [HeyGen v3 API](https://developers.heygen.com) (`https://api.heygen.com`). Generate AI avatar videos from a script or audio, generate short cinematic clips from a prompt, translate and lip-sync existing videos, drive the prompt-to-video Video Agent, synthesize speech, and browse the avatars and voices those jobs need. Video generation is **asynchronous**: a create tool returns an id, and you poll the matching `get*` tool until the job is `completed` and its result URLs appear.

## When to use this

- **Create AI videos** — an avatar (or animated image) speaking a script (`createVideo`), a short prompt-driven cinematic clip (`createCinematicVideo`), or a fully agent-authored video from a text prompt (`createVideoAgentVideo`).
- **Transform existing videos** — translate into other languages (`translateVideo`) or replace the audio and re-sync the lips (`createLipsync`).
- **Synthesize speech and pick voices/avatars** — text-to-speech (`generateSpeech`), and browse/clone/design voices and browse avatar looks to resolve the ids the create tools need.
- **Track async jobs and account state** — poll a video/translation/lipsync/session by id, list past jobs, and check remaining credits (`getCurrentUser`) before generating.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__heygen__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill heygen` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single `heygen` connection. Generate tools are asynchronous — pair each with its poll tool (e.g. `createVideo` → `getVideo`).

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

## Disambiguation & refusals

- **Resolve ids before generating; act on a single match.** The create tools take ids, not names — get an `avatar_id` from `listAvatarLooks`, a `voice_id` from `listVoices`, a `video_id` from `listVideos`. If a described avatar/voice/video has exactly one match, use it; if two or more tie on the described name/title, list the candidates with a distinguishing field (avatar type, language, created time) and ask which — don't silently pick.
- **Don't fake unsupported jobs.** This connector does **not** support: multi-scene "Studio" videos (per-scene avatars/backgrounds in one video), template-based video generation, uploading local asset files (pass a public HTTPS URL to `*_url` inputs instead), or photo-avatar/digital-twin _training_ pipelines beyond `createAvatar`'s entry point. If asked for one of these, say it isn't supported — don't substitute a different tool and report success for something you didn't do.
- **Generation is async and consumes credits.** A create call returning an id is _not_ a finished video — poll the `get*` tool until `completed`. Failed or in-progress jobs can still consume credits; `getCurrentUser` reports the remaining balance.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

HeyGen offers two auth paths, and they use **different credentials** — pick by how you're running the connector:

- **Direct** — `--connection env:HEYGEN_API_KEY`. A **long-lived API key** generated from the HeyGen API dashboard (rotated manually there; no browser consent), sent as the `X-Api-Key` header. Authorizes the whole catalog (no per-tool token split). Recommended for standalone use.
- **Zapier-managed** — `--connection zapier:<connection-id>` (a bare connection id also works). Routes through the connected HeyGen account's Zapier (OAuth) credential, injected per request. Both paths are verified.

**Billing depends on which auth path you use — and it changes which balance `getCurrentUser` reports.** Per HeyGen's pricing docs, an **API key bills the API tier**, so `getCurrentUser` returns the **`wallet`** balance; an **OAuth bearer token** (the Zapier-managed path) **bills the account's web subscription plan**, so `getCurrentUser` returns the **`subscription`** balance instead. Read the balance field that matches your auth path before a generate call to avoid `insufficient_credit`.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

| Reference                                                 | Load when                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [heygen-api-gotchas.md](references/heygen-api-gotchas.md) | Before building a HeyGen flow — async create→poll model, status enums, presigned-URL expiry, error codes, rate limits/concurrency, credits/billing, pagination, and per-domain rules (voices/TTS, avatars, cinematic, translation, lipsync, video agent). |
| [use-as-recipe.md](references/use-as-recipe.md)           | Loaded by a harness writing its own code against the vendor API (can't load the tools / run the CLI / import the package) — request patterns, response shapes, and pointers into the gotchas.                                                             |
