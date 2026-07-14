---
name: runway
description: Agent-callable Runway tools — generate images and video from text or images, edit and upscale media, animate characters, generate speech and sound effects, and run marketing recipes, plus track generation jobs. Use when the user mentions Runway or wants to generate, edit, or upscale AI media, even if they don't name Runway explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/runway/SKILL.md
  title: Runway
  api-docs: https://docs.dev.runwayml.com/
  zapier-app-key: RunwayCLIAPI
---

# Runway

_Independent, unofficial connector for Runway. Not affiliated with, endorsed by, or sponsored by Runway. "Runway" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Runway](https://docs.dev.runwayml.com/) generative media (`https://api.dev.runwayml.com/v1`): generate images and video from text or an image, edit/restyle and upscale existing media, animate a character from a driving performance, generate speech, sound effects, voice conversions and dubs, and run Runway's one-shot marketing "recipes" (product ads, campaign images, UGC, product swap, ad localization). Every generation is **asynchronous** — the generate/audio/recipe tools return a task id and you poll `getTask` for the finished asset URLs (or pass `wait: true` to block until the job finishes). Generated asset URLs **expire in 24-48 hours**, so download and rehost them promptly.

## When to use this

- **Generate visual media** — make an image (`generateImage`), a video from an image (`generateVideoFromImage`) or from text (`generateVideoFromText`), restyle a video (`editVideo`), upscale an image or video (`upscaleImage` / `upscaleVideo`), or animate a character (`animateCharacter`).
- **Generate audio** — text-to-speech (`generateSpeech`), sound effects (`generateSoundEffect`), voice conversion (`convertVoice`), dubbing (`dubAudio`), or voice isolation (`isolateVoice`).
- **Run marketing recipes** — one-shot higher-level jobs: `generateProductAd`, `generateCampaignImages`, `generateMarketingImage`, `swapProduct`, `generateProductUgc`, `generateMultiShotVideo`, `localizeAd`.
- **Track jobs and account** — check a job with `getTask`, stop one with `cancelTask`, and read credits / concurrency limits with `getOrganization` / `getCreditUsage`.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__runway__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill runway` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single connection `runway`. The generate, audio, and recipe tools are asynchronous — they return a task id (poll `getTask`), or accept `wait: true` to block until the job reaches a terminal state.

| Script                                                                   | Script name              | Connections | Description                                                                        |
| ------------------------------------------------------------------------ | ------------------------ | ----------- | ---------------------------------------------------------------------------------- |
| [`scripts/generateImage.ts`](scripts/generateImage.ts)                   | `generateImage`          | `runway`    | Generate an image from a text prompt, optionally guided by 1-3 reference images.   |
| [`scripts/generateVideoFromImage.ts`](scripts/generateVideoFromImage.ts) | `generateVideoFromImage` | `runway`    | Generate a video that animates a source image, guided by a motion prompt.          |
| [`scripts/generateVideoFromText.ts`](scripts/generateVideoFromText.ts)   | `generateVideoFromText`  | `runway`    | Generate a video from a text prompt alone (no source image).                       |
| [`scripts/editVideo.ts`](scripts/editVideo.ts)                           | `editVideo`              | `runway`    | Transform or restyle an existing video with a text prompt (Aleph).                 |
| [`scripts/upscaleImage.ts`](scripts/upscaleImage.ts)                     | `upscaleImage`           | `runway`    | Upscale an image to higher resolution.                                             |
| [`scripts/upscaleVideo.ts`](scripts/upscaleVideo.ts)                     | `upscaleVideo`           | `runway`    | Upscale a video to higher resolution.                                              |
| [`scripts/animateCharacter.ts`](scripts/animateCharacter.ts)             | `animateCharacter`       | `runway`    | Animate a character by transferring a performance from a driving video (Act-Two).  |
| [`scripts/getTask.ts`](scripts/getTask.ts)                               | `getTask`                | `runway`    | Get a generation task's status, progress, and finished asset URLs by id.           |
| [`scripts/cancelTask.ts`](scripts/cancelTask.ts)                         | `cancelTask`             | `runway`    | Cancel a running task, or delete a completed one, by id.                           |
| [`scripts/getOrganization.ts`](scripts/getOrganization.ts)               | `getOrganization`        | `runway`    | Read the organization's tier limits and current credit balance.                    |
| [`scripts/getCreditUsage.ts`](scripts/getCreditUsage.ts)                 | `getCreditUsage`         | `runway`    | Retrieve per-day, per-model credit usage over a date range.                        |
| [`scripts/generateSpeech.ts`](scripts/generateSpeech.ts)                 | `generateSpeech`         | `runway`    | Generate spoken audio from text, in a preset or cloned reference voice.            |
| [`scripts/generateSoundEffect.ts`](scripts/generateSoundEffect.ts)       | `generateSoundEffect`    | `runway`    | Generate a sound effect from a text description.                                   |
| [`scripts/convertVoice.ts`](scripts/convertVoice.ts)                     | `convertVoice`           | `runway`    | Replace the voice in an audio or video clip with a target voice.                   |
| [`scripts/dubAudio.ts`](scripts/dubAudio.ts)                             | `dubAudio`               | `runway`    | Dub an audio clip into a target language.                                          |
| [`scripts/isolateVoice.ts`](scripts/isolateVoice.ts)                     | `isolateVoice`           | `runway`    | Remove background audio and isolate the voice in a clip.                           |
| [`scripts/localizeAd.ts`](scripts/localizeAd.ts)                         | `localizeAd`             | `runway`    | Localize an existing ad image for a target language, preserving the creative.      |
| [`scripts/generateMarketingImage.ts`](scripts/generateMarketingImage.ts) | `generateMarketingImage` | `runway`    | Generate a polished marketing stock image from a brief and optional brand logo.    |
| [`scripts/generateMultiShotVideo.ts`](scripts/generateMultiShotVideo.ts) | `generateMultiShotVideo` | `runway`    | Generate a multi-cut video from a story prompt (auto) or a custom shot list.       |
| [`scripts/generateProductAd.ts`](scripts/generateProductAd.ts)           | `generateProductAd`      | `runway`    | Generate a cinematic product ad video from product images and creative direction.  |
| [`scripts/generateCampaignImages.ts`](scripts/generateCampaignImages.ts) | `generateCampaignImages` | `runway`    | Generate fashion campaign images from a product image and a style brief.           |
| [`scripts/swapProduct.ts`](scripts/swapProduct.ts)                       | `swapProduct`            | `runway`    | Replace the product in a reference video with a new product.                       |
| [`scripts/generateProductUgc.ts`](scripts/generateProductUgc.ts)         | `generateProductUgc`     | `runway`    | Generate a vertical UGC-style ad from a character image, product image, and brief. |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Runway uses a single **API secret** (a bearer token), created in the Runway Developer Portal (<https://dev.runwayml.com>). The same key authorizes every endpoint — there is no per-tool token, OAuth, or scope split. The connector resolves it into the one `runway` connection slot via two resolvers — the Zapier-managed one is recommended:

- **`zapier:<connection-id>`** _(recommended)_ — Zapier-managed auth. Route through a Zapier Runway connection; the Zapier auth, retries, and governance layer injects the key for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx zapier-sdk list-connections RunwayCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:<ENV_VAR>`** _(direct)_ — direct mode, for bring-your-own-key or local testing. Read the API secret from the named environment variable (conventionally `env:RUNWAY_API_KEY`, with the key exported in `RUNWAY_API_KEY`; the key stays in `env`, never on argv). The connector sends it as `Authorization: Bearer <key>`.

The connector always sets Runway's `X-Runway-Version` API-version header for you, pinned to a fixed version — you never set it. `getOrganization` is a good connection health check: it returns your tier limits and credit balance for a valid key.

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

## Disambiguation & refusals

Task ids passed to `getTask` / `cancelTask` come from the generate/audio/recipe tools' own output — there is no name-based lookup to disambiguate. Watch instead for jobs this connector deliberately does **not** cover; say so and stop rather than substituting another tool and reporting success:

- **Uploading local files / raw bytes.** There is no upload tool. Every asset input takes an **HTTPS URL** or a **data URI** — host the file and pass its URL. Don't claim a local path was uploaded.
- **Avatars, custom voice management, documents/knowledge, realtime sessions, saved workflows.** These separate Runway products are out of scope; this connector covers the generation core plus marketing recipes only.
- **Permanent deletion beyond a task.** `cancelTask` cancels/deletes a single generation task; there is no bulk or account-level delete.
- **Per-model pricing.** The API exposes no price catalog. `getCreditUsage` reports actual spend after the fact and `getOrganization` reports limits — neither quotes a per-generation price up front.

If asked for any of these, tell the user it's unsupported and stop.

## References

Load the matching reference file before working in that area:

| Reference                                                              | Covers                                                                                                                                                                                                                                             | Load it when                                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/runway-api-gotchas.md`](references/runway-api-gotchas.md) | Async task lifecycle + statuses (incl. `THROTTLED`), output-URL expiry, `failureCode` retry rules, HTTP errors, per-tier concurrency/daily/spend limits, input-asset size limits, content moderation, credit-usage windows, and the version header | A task never finishes or returns `THROTTLED`/`FAILED`, an output URL stops working, a call 4xx/429s, or you need model/tier/asset limits |
