---
name: youtube
description: Agent-callable YouTube tools — search and read videos, upload and update videos, manage playlists and playlist items, read and post comments, rate videos, manage subscriptions, and read channel and caption metadata. Use when the user mentions YouTube or wants to find, upload, comment on, or organize YouTube videos and playlists, even if they don't name YouTube explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: YouTube
  source: https://github.com/zapier/connectors/blob/main/apps/youtube/SKILL.md
  zapier-app-key: YouTubeV2CLIAPI
  api-docs: https://developers.google.com/youtube/v3
---

# YouTube

_Independent, unofficial connector for YouTube. Not affiliated with, endorsed by, or sponsored by YouTube. "YouTube" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with YouTube against the [YouTube Data API v3](https://developers.google.com/youtube/v3) (`https://www.googleapis.com/youtube/v3/`, with uploads on `https://www.googleapis.com/upload/youtube/v3/`): search and read videos, upload / update / delete videos, set thumbnails, like or dislike videos, create and manage playlists and their items, read and post comments, manage subscriptions, and read channel, category, and caption metadata. 24 tools across video discovery, video and playlist management, community engagement, and the read surfaces an agent needs to resolve ids.

## When to use this connector

- An agent needs to **find or read** video data — search for videos, get a video's full statistics and details, list the videos in a playlist, or read a channel's profile and uploads.
- An agent needs to **manage videos** — upload a new video, update an existing video's metadata without wiping the fields it didn't touch, set a custom thumbnail, like/dislike, or delete a video it owns.
- An agent needs to **organize playlists** — create, update, or delete playlists, and add or remove videos.
- An agent needs to **engage with the community** — read comment threads, post a comment, reply to a thread, or subscribe / unsubscribe to channels.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `youtube`.

| Script                                                                     | Tool name                 | Connections | Description                                                                                      |
| -------------------------------------------------------------------------- | ------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| [`scripts/searchVideos.ts`](scripts/searchVideos.ts)                       | `searchVideos`            | `youtube`   | Search videos by keyword, channel, date, or duration (id + snippet only; separate quota bucket). |
| [`scripts/getVideo.ts`](scripts/getVideo.ts)                               | `getVideo`                | `youtube`   | Get full details of one or more videos by id — snippet, statistics, contentDetails, status.      |
| [`scripts/uploadVideo.ts`](scripts/uploadVideo.ts)                         | `uploadVideo`             | `youtube`   | Upload a video file (from a URL) with metadata to the authenticated user's channel.              |
| [`scripts/updateVideo.ts`](scripts/updateVideo.ts)                         | `updateVideo`             | `youtube`   | Update a video's metadata (read-modify-write — only the fields you pass change).                 |
| [`scripts/deleteVideo.ts`](scripts/deleteVideo.ts)                         | `deleteVideo`             | `youtube`   | Permanently delete a video you own.                                                              |
| [`scripts/setVideoThumbnail.ts`](scripts/setVideoThumbnail.ts)             | `setVideoThumbnail`       | `youtube`   | Set or replace a video's custom thumbnail from an image URL (needs thumbnail-upload permission). |
| [`scripts/rateVideo.ts`](scripts/rateVideo.ts)                             | `rateVideo`               | `youtube`   | Like, dislike, or clear your rating on a video.                                                  |
| [`scripts/listPlaylists.ts`](scripts/listPlaylists.ts)                     | `listPlaylists`           | `youtube`   | List playlists owned by the user or a channel, or fetch playlists by id.                         |
| [`scripts/createPlaylist.ts`](scripts/createPlaylist.ts)                   | `createPlaylist`          | `youtube`   | Create a new playlist on the user's channel.                                                     |
| [`scripts/updatePlaylist.ts`](scripts/updatePlaylist.ts)                   | `updatePlaylist`          | `youtube`   | Update a playlist's title, description, or privacy (replaces, doesn't merge).                    |
| [`scripts/deletePlaylist.ts`](scripts/deletePlaylist.ts)                   | `deletePlaylist`          | `youtube`   | Permanently delete a playlist you own.                                                           |
| [`scripts/listPlaylistItems.ts`](scripts/listPlaylistItems.ts)             | `listPlaylistItems`       | `youtube`   | List the videos in a playlist, in order (each item carries its playlistItem id).                 |
| [`scripts/addVideoToPlaylist.ts`](scripts/addVideoToPlaylist.ts)           | `addVideoToPlaylist`      | `youtube`   | Add a video to a playlist you own.                                                               |
| [`scripts/removeVideoFromPlaylist.ts`](scripts/removeVideoFromPlaylist.ts) | `removeVideoFromPlaylist` | `youtube`   | Remove an item from a playlist (by playlistItem id, not video id).                               |
| [`scripts/listComments.ts`](scripts/listComments.ts)                       | `listComments`            | `youtube`   | List top-level comment threads on a video, each with its first replies.                          |
| [`scripts/postComment.ts`](scripts/postComment.ts)                         | `postComment`             | `youtube`   | Post a new top-level comment on a video (needs the comment scope).                               |
| [`scripts/replyToComment.ts`](scripts/replyToComment.ts)                   | `replyToComment`          | `youtube`   | Reply to an existing top-level comment thread (needs the comment scope).                         |
| [`scripts/getChannel.ts`](scripts/getChannel.ts)                           | `getChannel`              | `youtube`   | Get a channel's profile, statistics, and uploads-playlist id (by mine / id / @handle).           |
| [`scripts/listVideoCategories.ts`](scripts/listVideoCategories.ts)         | `listVideoCategories`     | `youtube`   | List the assignable video categories for a region.                                               |
| [`scripts/listSubscriptions.ts`](scripts/listSubscriptions.ts)             | `listSubscriptions`       | `youtube`   | List the user's subscriptions, or check a subscription to one channel.                           |
| [`scripts/subscribeToChannel.ts`](scripts/subscribeToChannel.ts)           | `subscribeToChannel`      | `youtube`   | Subscribe the user to a channel.                                                                 |
| [`scripts/unsubscribeFromChannel.ts`](scripts/unsubscribeFromChannel.ts)   | `unsubscribeFromChannel`  | `youtube`   | Unsubscribe the user from a channel (by subscription id, not channel id).                        |
| [`scripts/listCaptions.ts`](scripts/listCaptions.ts)                       | `listCaptions`            | `youtube`   | List the caption tracks available for a video (needs the comment/caption scope).                 |
| [`scripts/downloadCaption.ts`](scripts/downloadCaption.ts)                 | `downloadCaption`         | `youtube`   | Download a caption track's text in a chosen format (srt/vtt/sbv/scc/ttml).                       |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on either entrypoint — `./scripts/<script>.ts --help` or `npx @zapier/youtube-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag(s) and available resolvers.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

**Disambiguation before a write.** Before writing against a video, playlist, or channel you looked up by name (e.g. a video from `searchVideos`, a playlist from `listPlaylists`, a channel from `getChannel`/`searchVideos`), count the **exact case-insensitive title matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (channel title, publish date, view count, or the id) and ask the user which one they mean. Titles are not unique on YouTube — many videos and channels share a name — so never pick arbitrarily and never write to all of them.

**Mind the id traps.** `removeVideoFromPlaylist` takes the **playlistItem** id from `listPlaylistItems`, not the video id. `unsubscribeFromChannel` takes the **subscription** id from `listSubscriptions`, not the channel id. Passing the wrong id is the most common failure; resolve via the listed tool first.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Report analytics** (views-over-time, watch-time, revenue, demographics). There is no analytics tool. Don't substitute a video's lifetime `statistics` counts and present them as an analytics report.
- **Moderate comments** (edit, delete, hide, mark as spam, or set moderation status) — only reading, posting, and replying are supported. Replies are single-level: you cannot reply to a reply.
- **Live-stream** (create or manage broadcasts/streams) or **upload/replace captions** — captions are read-only here (list + download).
- **Administer a channel** (edit channel branding, sections, or settings).

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## Auth

YouTube uses **Google OAuth 2.0** with a single access token, resolved into the one `youtube` connection slot. Every tool uses the same credential; what a token can do is gated by **OAuth scope** (granted at connect) and by **resource ownership** (you can only modify videos, playlists, and subscriptions you own), not by token type. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a _selector_, not the secret. Two resolvers — the Zapier-managed one is recommended:

- **`zapier:<connection-id>`** _(recommended)_ — Zapier-managed auth. Route through a Zapier YouTube connection; the Zapier auth, retries, and governance layer injects the token and **handles refresh for you**. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections YouTubeV2CLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:<ENV_VAR>`** — direct mode, for bring-your-own-token or local testing. Read a Google OAuth access token from the named environment variable (conventionally `env:YOUTUBE_ACCESS_TOKEN`, with the token exported in `YOUTUBE_ACCESS_TOKEN`). The token must carry the scopes for the tools you call. Google access tokens expire ~1 hour after issue and are **not** refreshed in direct mode, so this suits short-lived / testing use.

**Scopes.** The connection should be granted the access the tools you use need:

- `youtube.readonly` — all read / list tools (search, videos, playlists, playlist items, channels, categories, subscriptions, comment threads).
- `youtube` — manage tools: playlist create/update/delete, playlist-item add/remove, subscribe/unsubscribe, video update/delete, **and rateVideo** (rating does _not_ need the comment scope).
- `youtube.force-ssl` — **required** for all comment writes (`postComment`, `replyToComment`) and for **all caption** operations (`listCaptions`, `downloadCaption`).
- `youtube.upload` — `uploadVideo` and `setVideoThumbnail`.

A request made with an insufficient scope returns **403**; reconnect YouTube with the broader access. A 403 because you don't **own** the resource is a different problem — reconnecting won't help.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Using this skill

### 0. Pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next. The `--help` output renders `inputSchema` as JSON Schema, lists the connection flag(s) the script reads and every resolver each accepts, and tells you exactly what to provide. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward.

The three invocation paths below all assume the pre-flight reported `READY`.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth resolver is ready — `--help` is the one path for both "learn the input contract" and "check auth":

```bash
# Inspect the contract + resolvers first
./scripts/getVideo.ts --help

# Then invoke (direct token — token stays in env)
YOUTUBE_ACCESS_TOKEN=ya29.xxx ./scripts/getVideo.ts '{"id":"dQw4w9WgXcQ"}' --connection env:YOUTUBE_ACCESS_TOKEN

# Or route through a Zapier connection
./scripts/searchVideos.ts '{"q":"lo-fi beats"}' --connection zapier:conn_xxx
```

Prerequisites: Node.js 22.18+ (or Bun 1.x) on `PATH`, plus `npm install` once in this directory. Pin the runtime explicitly with `node scripts/<name>.ts …` or `bun scripts/<name>.ts …` when needed — all forms run the same script body.

### 2. Use the package's CLI

```bash
YOUTUBE_ACCESS_TOKEN=ya29.xxx npx @zapier/youtube-connector run getVideo '{"id":"dQw4w9WgXcQ"}' --connection env:YOUTUBE_ACCESS_TOKEN
npx @zapier/youtube-connector --help                  # all scripts
npx @zapier/youtube-connector run getVideo --help     # per-script schema + resolvers
```

Same scripts, different entry point. Use `bunx` when `PREFLIGHT_RUNNER` is `bun`. Some harnesses block `npx`/`bunx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"youtube"`; imitate that shape (Zod input/output schemas, `(input, ctx) => …` run body, the direct-mode auth being a Bearer token in the `Authorization` header). If you persist generated code, add a comment pointing back to this skill's source:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/youtube/SKILL.md
```

## API quirks worth knowing

| Reference                                                                | Load when                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/youtube-api-gotchas.md`](references/youtube-api-gotchas.md) | Before relying on counts, quotas, scopes, pagination, IDs, or any non-obvious response field — covers the `part` model, the per-bucket quota system (search/upload), the error envelope and `reason`→recovery mapping, OAuth scope requirements (`youtube.force-ssl`, `youtube.upload`), counts-as-strings, and per-resource quirks for videos, search, playlists, comments, captions, channels, and subscriptions. |
