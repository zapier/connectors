---
name: elevenlabs
description: Agent-callable ElevenLabs tools — generate spoken audio from text, create sound effects and multi-speaker dialogue, re-voice and clean up audio, transcribe audio and video, design synthetic voices, and manage voices, history, and quota. Use when the user mentions ElevenLabs or wants AI audio work — text to speech, narration, voiceover, transcription, voice changing, or sound design — even if they don't name ElevenLabs explicitly, e.g. "read this aloud", "make an MP3 of this", "transcribe this recording".
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/elevenlabs/SKILL.md
  title: Elevenlabs
  api-docs: https://elevenlabs.io/docs/api-reference/introduction
  zapier-app-key: App226160CLIAPI
---

# Elevenlabs

_Independent, unofficial connector for Elevenlabs. Not affiliated with, endorsed by, or sponsored by Elevenlabs. "Elevenlabs" is a trademark of its owner, used only to identify the service this connector works with._

Tools for the ElevenLabs AI-audio API: convert text to spoken audio in any of the account's voices, generate sound effects and multi-speaker dialogue, re-voice or denoise existing audio, transcribe audio and video by URL, design brand-new synthetic voices from a text description, and manage the account's voices, generation history, and credit quota. Audio-producing tools write the audio to a local file and return its path by default; pass `return_base64: true` to get the bytes inline instead (for consumers without filesystem access).

## When to use this

- Turn text into audio: narration, a spoken reply, a podcast-style dialogue, or a sound effect described in words.
- Transform existing audio: transcribe it, isolate the speech from background noise, or re-voice it in a different voice.
- Manage voices: find one in the account or the community library, add it, design a new one from a description, or free up voice slots.
- Check the account before big generations: remaining character credits, tier gates, and voice-slot usage via `getUserSubscription`.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__elevenlabs__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill elevenlabs` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts share the single `elevenlabs` connection. Audio-producing scripts accept `return_base64` (default false: audio is written to a temp file and returned as `audio_path`).

| Script                             | Script name             | Connections | Description                                                                                   |
| ---------------------------------- | ----------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `scripts/textToSpeech.ts`          | `textToSpeech`          | elevenlabs  | Convert text to spoken audio in a chosen voice (resolve `voice_id` via `listVoices`).         |
| `scripts/createSoundEffect.ts`     | `createSoundEffect`     | elevenlabs  | Generate a sound effect (not speech) from a text description.                                 |
| `scripts/textToDialogue.ts`        | `textToDialogue`        | elevenlabs  | Generate a multi-speaker conversation from a list of `{ text, voice_id }` lines.              |
| `scripts/speechToSpeech.ts`        | `speechToSpeech`        | elevenlabs  | Re-voice existing speech in a different voice; source is an HTTPS URL or local path.          |
| `scripts/isolateAudio.ts`          | `isolateAudio`          | elevenlabs  | Remove background noise/music from a recording; source is an HTTPS URL or local path.         |
| `scripts/speechToText.ts`          | `speechToText`          | elevenlabs  | Transcribe audio/video from an HTTPS URL, with timestamps and speaker labels.                 |
| `scripts/designVoice.ts`           | `designVoice`           | elevenlabs  | Design a new synthetic voice from a text description; returns candidate previews.             |
| `scripts/createVoiceFromDesign.ts` | `createVoiceFromDesign` | elevenlabs  | Save a designed voice (by `generated_voice_id` from `designVoice`) to the account.            |
| `scripts/listVoices.ts`            | `listVoices`            | elevenlabs  | List the account's voices — the `voice_id` resolver.                                          |
| `scripts/getVoice.ts`              | `getVoice`              | elevenlabs  | Get one voice's full metadata by id.                                                          |
| `scripts/searchVoiceLibrary.ts`    | `searchVoiceLibrary`    | elevenlabs  | Search the community voice library by name, language, gender, age, accent.                    |
| `scripts/addSharedVoice.ts`        | `addSharedVoice`        | elevenlabs  | Add a community library voice to the account (uses a voice slot).                             |
| `scripts/deleteVoice.ts`           | `deleteVoice`           | elevenlabs  | Remove a voice from the account; frees a voice slot. Irreversible for designed/cloned voices. |
| `scripts/listModels.ts`            | `listModels`            | elevenlabs  | List models with capabilities and per-request character limits.                               |
| `scripts/listHistory.ts`           | `listHistory`           | elevenlabs  | List previously generated audio items; filter by voice, model, date, or text.                 |
| `scripts/getHistoryItem.ts`        | `getHistoryItem`        | elevenlabs  | Get one generation's metadata (voice, text, cost) by `history_item_id`.                       |
| `scripts/downloadHistoryAudio.ts`  | `downloadHistoryAudio`  | elevenlabs  | Re-fetch the audio of a previous generation — free, no new credits.                           |
| `scripts/deleteHistoryItem.ts`     | `deleteHistoryItem`     | elevenlabs  | Permanently delete one generated item from history. Irreversible.                             |
| `scripts/getUserSubscription.ts`   | `getUserSubscription`   | elevenlabs  | Check tier, character credits used/limit, reset time, and voice-slot usage.                   |

## Disambiguation & refusals

**Name-matched voices.** Voices are looked up by human-friendly names (`listVoices` search, `searchVoiceLibrary`), and names collide — several account or library voices can share "George" or "Rachel". Before generating with, deleting, or adding a voice matched by name: count exact (case-insensitive) name matches. Exactly one → act on it without asking. Two or more → stop, list the candidates with a distinguishing field (category, description, or accent), and ask which one. Never silently pick. The same rule applies to history items matched by their source text via `listHistory` search before `deleteHistoryItem`.

**Unsupported operations.** This connector does not clone voices from sample recordings (instant or professional voice cloning) and does not generate music. If asked, say the operation isn't supported here and stop — don't substitute `designVoice` (which invents a voice from a description, not from someone's recording) or `createSoundEffect` (which makes sound effects, not music) and report success for an action you didn't perform.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Two resolvers serve the `elevenlabs` connection:

- **`zapier:<connection-id>`** — Zapier-managed auth. The connection id points at an ElevenLabs connection in your Zapier account (create one at zapier.com if needed); Zapier injects the API key per request, so no third-party secret enters the agent's environment. A bare UUID-shaped value is claimed by this resolver automatically.
- **`env:ELEVENLABS_API_KEY`** — direct mode. The value names an environment variable holding an ElevenLabs API key (create one at elevenlabs.io → Settings → API keys); the connector sends it as the API's `xi-api-key` header. Any env-var name works — `ELEVENLABS_API_KEY` is the conventional one.

Note on API-key permissions: ElevenLabs keys can be restricted per surface (text-to-speech, voices, history, …) and can carry a quota cap. A valid key can still get 401 on an endpoint outside its granted permissions — check the key's permissions before assuming it's dead.

Note on Zapier-managed connections: the managed-connection layer can't forward multipart request bodies yet, so the three audio-upload tools — `speechToSpeech`, `speechToText`, and `isolateAudio` — require direct mode (`env:<VAR>`). All other tools work over either resolver.

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

Load the matching reference file before working in that area:

| Reference                                                      | Covers                                                                                                        | Load it when                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [ElevenLabs API gotchas](references/elevenlabs-api-gotchas.md) | Authentication, errors, model and voice resolution, generation limits, transcription, pagination, and history | Choosing IDs or models, preparing audio inputs, paginating results, or recovering from API errors |
