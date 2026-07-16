# @zapier/youtube-connector

_Independent, unofficial connector for YouTube. Not affiliated with, endorsed by, or sponsored by YouTube. "YouTube" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable scripts for the [YouTube Data API v3](https://developers.google.com/youtube/v3) (`https://www.googleapis.com/youtube/v3/`): search and read videos, update or delete videos, manage playlists and playlist items, read and post comments, rate videos, manage subscriptions, and read channel and caption metadata — 22 scripts spanning video discovery and detail, playlist management, community engagement, and the read surfaces an agent needs to resolve ids. Auth is Google OAuth 2.0 — a single access token whose capabilities are gated by OAuth scope and by resource ownership.

## When to use this

- An agent needs to read YouTube data — find videos, pull a video's full statistics and details, enumerate a playlist or a channel's uploads, or read comment threads.
- An agent needs to manage a creator's own content — update videos, organize playlists, post or reply to comments, or manage subscriptions.
- You want a single, scope-gated OAuth surface over the YouTube Data API that resolves ids (channels → uploads playlist, categories, caption tracks) the way an agent reasons about them.

## When NOT to use this

- **Analytics / reporting** (views-over-time, watch-time, revenue, demographics) — not covered; that's the YouTube Analytics API.
- **Video upload, custom thumbnails, live streaming, comment moderation, caption upload, or channel administration** — out of scope for v1 (video upload and thumbnails require binary media uploads the connection transport doesn't support; captions are read-only here).
- **Bulk discovery via search** — `search.list` costs 100 quota units and is eventually consistent; to enumerate a known channel's videos, prefer `getChannel` → `listPlaylistItems` on the uploads playlist.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/youtube-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/youtube-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill youtube
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["@zapier/youtube-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                    | Description                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `searchVideos`            | Search videos by keyword, channel, date, or duration (id + snippet only; separate quota bucket). |
| `getVideo`                | Get full details of one or more videos by id — snippet, statistics, contentDetails, status.      |
| `updateVideo`             | Update a video's metadata (read-modify-write — only the fields you pass change).                 |
| `deleteVideo`             | Permanently delete a video you own.                                                              |
| `rateVideo`               | Like, dislike, or clear your rating on a video.                                                  |
| `listPlaylists`           | List playlists owned by the user or a channel, or fetch playlists by id.                         |
| `createPlaylist`          | Create a new playlist on the user's channel.                                                     |
| `updatePlaylist`          | Update a playlist's title, description, or privacy (replaces, doesn't merge).                    |
| `deletePlaylist`          | Permanently delete a playlist you own.                                                           |
| `listPlaylistItems`       | List the videos in a playlist, in order (each item carries its playlistItem id).                 |
| `addVideoToPlaylist`      | Add a video to a playlist you own.                                                               |
| `removeVideoFromPlaylist` | Remove an item from a playlist (by playlistItem id, not video id).                               |
| `listComments`            | List top-level comment threads on a video, each with its first replies.                          |
| `postComment`             | Post a new top-level comment on a video (needs the comment scope).                               |
| `replyToComment`          | Reply to an existing top-level comment thread (needs the comment scope).                         |
| `getChannel`              | Get a channel's profile, statistics, and uploads-playlist id (by mine / id / @handle).           |
| `listVideoCategories`     | List the assignable video categories for a region.                                               |
| `listSubscriptions`       | List the user's subscriptions, or check a subscription to one channel.                           |
| `subscribeToChannel`      | Subscribe the user to a channel.                                                                 |
| `unsubscribeFromChannel`  | Unsubscribe the user from a channel (by subscription id, not channel id).                        |
| `listCaptions`            | List the caption tracks available for a video (needs the comment/caption scope).                 |
| `downloadCaption`         | Download a caption track's text in a chosen format (srt/vtt/sbv/scc/ttml).                       |

Run `npx @zapier/youtube-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { getVideo } from "@zapier/youtube-connector";

const { data } = await getVideo(
  { id: "dQw4w9WgXcQ" },
  { connection: "env:YOUTUBE_ACCESS_TOKEN" },
);
// data.items[0].statistics.viewCount → counts are returned as strings, not numbers; meta.outputDataValidation reports any stripped fields.
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/youtube)
- [YouTube Data API v3 reference](https://developers.google.com/youtube/v3)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in YouTube's API, services, data, schemas, documentation, or other materials, which remain the property of YouTube. Your use of YouTube's API is governed by your own agreement with YouTube.

**Trademarks and affiliation.** YouTube and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by YouTube.

**Your responsibility.** This connector calls YouTube's API using credentials you supply. You are responsible for holding a valid YouTube account, for complying with YouTube's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official YouTube product. Zapier is not responsible for changes YouTube makes to its API or for any consequence of your use of YouTube's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
