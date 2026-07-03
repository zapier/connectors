---
name: youtube
description: Agent-callable YouTube tools — search and read videos, update and delete videos, manage playlists and playlist items, read and post comments, rate videos, manage subscriptions, and read channel and caption metadata. Use when the user mentions YouTube or wants to find, comment on, or organize YouTube videos and playlists, even if they don't name YouTube explicitly.
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  title: YouTube
  source: https://github.com/zapier/connectors/blob/main/apps/youtube/SKILL.md
  zapier-app-key: YouTubeV2CLIAPI
  api-docs: https://developers.google.com/youtube/v3
---

# YouTube

_Independent, unofficial connector for YouTube. Not affiliated with, endorsed by, or sponsored by YouTube. "YouTube" is a trademark of its owner, used only to identify the service this connector works with._

Scripts for working with YouTube against the [YouTube Data API v3](https://developers.google.com/youtube/v3) (`https://www.googleapis.com/youtube/v3/`): search and read videos, update or delete videos, like or dislike videos, create and manage playlists and their items, read and post comments, manage subscriptions, and read channel, category, and caption metadata. 22 scripts across video discovery, video and playlist management, community engagement, and the read surfaces an agent needs to resolve ids.

## When to use this

- An agent needs to **find or read** video data — search for videos, get a video's full statistics and details, list the videos in a playlist, or read a channel's profile and uploads.
- An agent needs to **manage videos** — update an existing video's metadata without wiping the fields it didn't touch, like/dislike, or delete a video it owns.
- An agent needs to **organize playlists** — create, update, or delete playlists, and add or remove videos.
- An agent needs to **engage with the community** — read comment threads, post a comment, reply to a thread, or subscribe / unsubscribe to channels.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__youtube__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill youtube` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

One file per script in [`scripts/`](scripts/); each script's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All scripts use the single connection `youtube`.

| Script                                                                     | Script name               | Connections        | Description                                                                                      |
| -------------------------------------------------------------------------- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| [`scripts/searchVideos.ts`](scripts/searchVideos.ts)                       | `searchVideos`            | Single (`youtube`) | Search videos by keyword, channel, date, or duration (id + snippet only; separate quota bucket). |
| [`scripts/getVideo.ts`](scripts/getVideo.ts)                               | `getVideo`                | Single (`youtube`) | Get full details of one or more videos by id — snippet, statistics, contentDetails, status.      |
| [`scripts/updateVideo.ts`](scripts/updateVideo.ts)                         | `updateVideo`             | Single (`youtube`) | Update a video's metadata (read-modify-write — only the fields you pass change).                 |
| [`scripts/deleteVideo.ts`](scripts/deleteVideo.ts)                         | `deleteVideo`             | Single (`youtube`) | Permanently delete a video you own.                                                              |
| [`scripts/rateVideo.ts`](scripts/rateVideo.ts)                             | `rateVideo`               | Single (`youtube`) | Like, dislike, or clear your rating on a video.                                                  |
| [`scripts/listPlaylists.ts`](scripts/listPlaylists.ts)                     | `listPlaylists`           | Single (`youtube`) | List playlists owned by the user or a channel, or fetch playlists by id.                         |
| [`scripts/createPlaylist.ts`](scripts/createPlaylist.ts)                   | `createPlaylist`          | Single (`youtube`) | Create a new playlist on the user's channel.                                                     |
| [`scripts/updatePlaylist.ts`](scripts/updatePlaylist.ts)                   | `updatePlaylist`          | Single (`youtube`) | Update a playlist's title, description, or privacy (replaces, doesn't merge).                    |
| [`scripts/deletePlaylist.ts`](scripts/deletePlaylist.ts)                   | `deletePlaylist`          | Single (`youtube`) | Permanently delete a playlist you own.                                                           |
| [`scripts/listPlaylistItems.ts`](scripts/listPlaylistItems.ts)             | `listPlaylistItems`       | Single (`youtube`) | List the videos in a playlist, in order (each item carries its playlistItem id).                 |
| [`scripts/addVideoToPlaylist.ts`](scripts/addVideoToPlaylist.ts)           | `addVideoToPlaylist`      | Single (`youtube`) | Add a video to a playlist you own.                                                               |
| [`scripts/removeVideoFromPlaylist.ts`](scripts/removeVideoFromPlaylist.ts) | `removeVideoFromPlaylist` | Single (`youtube`) | Remove an item from a playlist (by playlistItem id, not video id).                               |
| [`scripts/listComments.ts`](scripts/listComments.ts)                       | `listComments`            | Single (`youtube`) | List top-level comment threads on a video, each with its first replies.                          |
| [`scripts/postComment.ts`](scripts/postComment.ts)                         | `postComment`             | Single (`youtube`) | Post a new top-level comment on a video (needs the comment scope).                               |
| [`scripts/replyToComment.ts`](scripts/replyToComment.ts)                   | `replyToComment`          | Single (`youtube`) | Reply to an existing top-level comment thread (needs the comment scope).                         |
| [`scripts/getChannel.ts`](scripts/getChannel.ts)                           | `getChannel`              | Single (`youtube`) | Get a channel's profile, statistics, and uploads-playlist id (by mine / id / @handle).           |
| [`scripts/listVideoCategories.ts`](scripts/listVideoCategories.ts)         | `listVideoCategories`     | Single (`youtube`) | List the assignable video categories for a region.                                               |
| [`scripts/listSubscriptions.ts`](scripts/listSubscriptions.ts)             | `listSubscriptions`       | Single (`youtube`) | List the user's subscriptions, or check a subscription to one channel.                           |
| [`scripts/subscribeToChannel.ts`](scripts/subscribeToChannel.ts)           | `subscribeToChannel`      | Single (`youtube`) | Subscribe the user to a channel.                                                                 |
| [`scripts/unsubscribeFromChannel.ts`](scripts/unsubscribeFromChannel.ts)   | `unsubscribeFromChannel`  | Single (`youtube`) | Unsubscribe the user from a channel (by subscription id, not channel id).                        |
| [`scripts/listCaptions.ts`](scripts/listCaptions.ts)                       | `listCaptions`            | Single (`youtube`) | List the caption tracks available for a video (needs the comment/caption scope).                 |
| [`scripts/downloadCaption.ts`](scripts/downloadCaption.ts)                 | `downloadCaption`         | Single (`youtube`) | Download a caption track's text in a chosen format (srt/vtt/sbv/scc/ttml).                       |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `node cli.js run <script> --help` (or `./scripts/<script>.ts --help`), which renders `inputSchema` as JSON Schema and lists the connection(s) and available resolvers.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

YouTube uses **Google OAuth 2.0** with a single access token, resolved into the one `youtube` connection slot. Every script uses the same credential; what a token can do is gated by **OAuth scope** (granted at connect) and by **resource ownership** (you can only modify videos, playlists, and subscriptions you own), not by token type. Two resolvers — the Zapier-managed one is recommended:

- **`zapier:<connection-id>`** _(recommended)_ — Zapier-managed auth. Route through a Zapier YouTube connection; the Zapier auth, retries, and governance layer injects the token and **handles refresh for you**. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx zapier-sdk list-connections YouTubeV2CLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:YOUTUBE_ACCESS_TOKEN`** _(direct)_ — direct mode, for bring-your-own-token or local testing. Read a Google OAuth access token from the named environment variable (conventionally `env:YOUTUBE_ACCESS_TOKEN`, with the token exported in `YOUTUBE_ACCESS_TOKEN`). The token must carry the scopes for the scripts you call. Google access tokens expire ~1 hour after issue and are **not** refreshed in direct mode, so this suits short-lived / testing use.

**Scopes.** The connection should be granted the access the scripts you use need:

- `youtube.readonly` — all read / list scripts (search, videos, playlists, playlist items, channels, categories, subscriptions, comment threads).
- `youtube` — manage scripts: playlist create/update/delete, playlist-item add/remove, subscribe/unsubscribe, video update/delete, **and rateVideo** (rating does _not_ need the comment scope).
- `youtube.force-ssl` — **required** for all comment writes (`postComment`, `replyToComment`) and for **all caption** operations (`listCaptions`, `downloadCaption`).

A request made with an insufficient scope returns **403**; reconnect YouTube with the broader access. A 403 because you don't **own** the resource is a different problem — reconnecting won't help.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

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

**Disambiguation before a write.** Before writing against a video, playlist, or channel you looked up by name (e.g. a video from `searchVideos`, a playlist from `listPlaylists`, a channel from `getChannel`/`searchVideos`), count the **exact case-insensitive title matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (channel title, publish date, view count, or the id) and ask the user which one they mean. Titles are not unique on YouTube — many videos and channels share a name — so never pick arbitrarily and never write to all of them.

**Mind the id traps.** `removeVideoFromPlaylist` takes the **playlistItem** id from `listPlaylistItems`, not the video id. `unsubscribeFromChannel` takes the **subscription** id from `listSubscriptions`, not the channel id. Passing the wrong id is the most common failure; resolve via the listed script first.

**Unsupported operations — say so and stop; don't fake it with another script.** This catalog deliberately does not:

- **Report analytics** (views-over-time, watch-time, revenue, demographics). There is no analytics script. Don't substitute a video's lifetime `statistics` counts and present them as an analytics report.
- **Moderate comments** (edit, delete, hide, mark as spam, or set moderation status) — only reading, posting, and replying are supported. Replies are single-level: you cannot reply to a reply.
- **Live-stream** (create or manage broadcasts/streams) or **upload/replace captions** — captions are read-only here (list + download).
- **Upload videos or set custom thumbnails** — there is no `uploadVideo` or `setVideoThumbnail` script. These require binary media uploads, which the connection transport does not support.
- **Administer a channel** (edit channel branding, sections, or settings).

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated script to approximate it.

## References

Load the matching reference file before working in that area:

| Reference                                                                | Covers                                                                                                                                                                                                                                                                         | Load it when                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`references/youtube-api-gotchas.md`](references/youtube-api-gotchas.md) | The `part` model, per-bucket quota system, error envelope and `reason`→recovery mapping, OAuth scope requirements (`youtube`, `youtube.force-ssl`), counts-as-strings, and per-resource quirks for videos, search, playlists, comments, captions, channels, and subscriptions. | Before relying on counts, quotas, scopes, pagination, IDs, or any non-obvious response field. |
