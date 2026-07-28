# Using Discord without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Base URL & auth

Everything is under `https://discord.com/api/v10`. Every call is **your authed
request** carrying `Authorization: Bot <token>` (see `discord-api-gotchas.md` for
the scheme detail and how to get a token). JSON request bodies go out with
`Content-Type: application/json`. Below, `enc(x)` means URL-encode the path
segment `x`.

## Request patterns per operation family

Method + endpoint + input, distilled from each script's own schema/request logic.
IDs are snowflake **strings** everywhere — never coerce (see gotchas).

### Guilds & users (read)

- `listGuilds` → `GET /users/@me/guilds?limit&after` — `limit` 1–200 (default 20),
  `after` = last id for forward paging.
- `getGuild` → `GET /guilds/{enc(guild_id)}`
- `getCurrentUser` → `GET /users/@me` (no input; validates the token)
- `getUser` → `GET /users/{enc(user_id)}`

### Channels & threads

- `listChannels` → `GET /guilds/{enc(guild_id)}/channels` (does **not** include threads)
- `listActiveThreads` → `GET /guilds/{enc(guild_id)}/threads/active` (response has a
  `threads` array; the tool returns that array)
- `getChannel` → `GET /channels/{enc(channel_id)}`
- `createChannel` → `POST /guilds/{enc(guild_id)}/channels`, body `{ name, type?, topic?, parent_id? }`
- `modifyChannel` → `PATCH /channels/{enc(channel_id)}`, body `{ name?, topic? }`
- `createThread` → `POST /channels/{enc(channel_id)}/threads`, body
  `{ name, message?, type?, auto_archive_duration?, applied_tags? }` — on a forum
  channel `message` is the required opening post; on a text/announcement channel
  omit `message` for a standalone thread.

### Members & roles

- `listMembers` → `GET /guilds/{enc(guild_id)}/members?limit&after` — needs the
  Server Members intent (gotchas). Response is a bare array; tool wraps as `{ members }`.
- `searchMembers` → `GET /guilds/{enc(guild_id)}/members/search?query&limit`
- `getMember` → `GET /guilds/{enc(guild_id)}/members/{enc(user_id)}`
- `listRoles` → `GET /guilds/{enc(guild_id)}/roles`
- `createRole` → `POST /guilds/{enc(guild_id)}/roles`, body `{ name, color?, hoist?, mentionable? }`
- `addMemberRole` → `PUT /guilds/{enc(guild_id)}/members/{enc(user_id)}/roles/{enc(role_id)}` (no body)
- `removeMemberRole` → `DELETE /guilds/{enc(guild_id)}/members/{enc(user_id)}/roles/{enc(role_id)}`
  — both gated by permission **and** role hierarchy (gotchas).

### Messages

- `listChannelMessages` → `GET /channels/{enc(channel_id)}/messages?limit&before&after&around`
  (`limit` 1–100); response is a bare array, wrapped as `{ messages }`.
- `getMessage` → `GET /channels/{enc(channel_id)}/messages/{enc(message_id)}`
- `sendChannelMessage` → `POST /channels/{enc(channel_id)}/messages`, body
  `{ content, tts?, message_reference?, allowed_mentions? }`
- `editMessage` → `PATCH /channels/{enc(channel_id)}/messages/{enc(message_id)}`,
  body `{ content }` (bot can edit only its own messages)
- `deleteMessage` → `DELETE /channels/{enc(channel_id)}/messages/{enc(message_id)}`
- `sendDirectMessage` → two steps: `POST /users/@me/channels` with body
  `{ recipient_id }` to get a DM channel `{ id }`, then `POST /channels/{enc(id)}/messages`
  with `{ content, tts? }`.

### Reactions

- `addReaction` → `PUT /channels/{enc(channel_id)}/messages/{enc(message_id)}/reactions/{enc(emoji)}/@me` (no body)
- `removeReaction` → `DELETE /channels/{enc(channel_id)}/messages/{enc(message_id)}/reactions/{enc(emoji)}/@me`
  — `emoji` encoding is load-bearing; see `discord-formatting.md`.

### Webhooks

- `listChannelWebhooks` → `GET /channels/{enc(channel_id)}/webhooks` (wrapped as `{ webhooks }`)
- `createWebhook` → `POST /channels/{enc(channel_id)}/webhooks`, body `{ name }`
  (returns `id` + `token` — treat `token` as a credential)
- `executeWebhook` → `POST /webhooks/{enc(webhook_id)}/{enc(webhook_token)}?wait=true`,
  body `{ content, username?, avatar_url?, tts? }`. Send `wait=true` so the API
  returns the created message instead of an empty `204`.

## Structural response shapes

Field names + types from the scripts' output schemas (structure only — never
copy a live value):

- **Message**: `{ id: string, channel_id: string, content: string, timestamp: string,
edited_timestamp?: string|null, tts?: boolean|null, pinned?: boolean|null,
author?: { id, username, global_name?, discriminator?, bot?, avatar? }|null }`
- **Channel / thread**: `{ id: string, type: number, name?: string|null,
guild_id?: string|null, parent_id?: string|null, topic?: string|null }`
- **Member**: `{ nick?: string|null, roles: string[], joined_at?: string|null,
user: { id, username, global_name?, discriminator?, bot?, avatar? } }`
- **Role**: `{ id: string, name: string, color?: number|null, hoist?: boolean|null,
position?: number|null, permissions?: string|null, mentionable?: boolean|null }`
- **User**: `{ id: string, username: string, global_name?: string|null,
discriminator?: string|null, bot?: boolean|null, avatar?: string|null }`
- **Guild** (`getGuild`): `{ id, name, owner_id?, description?, approximate_member_count? }`;
  (`listGuilds` item): `{ id, name, owner?, permissions? }`
- **Emoji**: `{ id: string, name: string, animated?: boolean|null }`
- **Webhook**: `{ id: string, token?: string|null, name: string, channel_id?, guild_id? }`
- **Status-only tools** (`addReaction`, `removeReaction`, `addMemberRole`,
  `removeMemberRole`, `deleteMessage`): `{ status: number }` from the HTTP status
  (many of these are `204 No Content`).

## Error envelope

Failed calls return the JSON envelope `{ code, message, errors? }` — `code` is
Discord's own numeric error code, separate from the HTTP status. For what each
code means and how to recover (e.g. `50013` role-hierarchy failures, `429` retry
handling), see `discord-api-gotchas.md` rather than restating here.

## Critical rules (pointers, not restatements)

- Snowflake ids and `permissions` bitfields are **strings** — never coerce. → gotchas
- `listMembers`/`searchMembers` need the **Server Members intent** enabled. → gotchas
- Role writes need `MANAGE_ROLES` **and** the bot's top role above the target. → gotchas
- Rate limits: 50 req/s global, per-route/per-resource buckets, honor `retry_after`. → gotchas
- Message `content` is capped at 2000 chars; mentions and `allowed_mentions: { parse: [] }`
  (mention without pinging) and reaction emoji encoding. → formatting
