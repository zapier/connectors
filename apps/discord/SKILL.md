---
name: discord
description: Agent-callable Discord tools — send and manage messages, start threads and forum posts, manage channels, members, and roles, and post via webhooks. Use when the user mentions Discord or wants to post, read, or manage Discord servers, channels, or members, even if they don't name Discord explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/discord/SKILL.md
  title: Discord
  api-docs: https://docs.discord.com/developers/reference
  zapier-app-key: DiscordCLIAPI
---

# Discord

_Independent, unofficial connector for Discord. Not affiliated with, endorsed by, or sponsored by Discord. "Discord" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for a Discord server, running against the [Discord API](https://docs.discord.com/developers/reference) (`https://discord.com/api/v10`). The connector authenticates as a **bot** added to one or more servers: send and manage messages, start threads and forum posts, create and edit channels, manage members and roles, post through channel webhooks, and read the servers, channels, members, roles, and emojis an agent needs to resolve the ids those actions take. 29 scripts. Because a single bot can belong to many servers, every server-scoped tool takes an explicit `guild_id` (a server id), which you resolve with `listGuilds`.

## When to use this

- An agent needs to **send or manage messages** — post to a channel, thread, or forum post, reply, edit or delete a message, add or remove reactions, or DM a user.
- An agent needs to **manage threads and channels** — start a forum post or standalone thread, create a channel, rename or re-topic one, and list channels or active threads.
- An agent needs to **administer members and roles** — list, search, or read members, add or remove roles, and list or create roles.
- An agent needs to **read servers and resolve ids** — list the bot's servers, read a server / user / member, list custom emojis, and post via channel webhooks under a custom identity.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__discord__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill discord` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All 29 scripts use the single connection `discord` (a bot token). Server-scoped tools take an explicit `guild_id` — resolve it with `listGuilds` first. Every other required id has a resolver: `channel_id` ← `listChannels`, `user_id` ← `listMembers` / `searchMembers`, `role_id` ← `listRoles`, custom emoji ← `listEmojis`, `message_id` ← `listChannelMessages`, and `webhook_id` / `webhook_token` ← `createWebhook` / `listChannelWebhooks`.

| Script                                                             | Script name           | Connections | Description                                                                                     |
| ------------------------------------------------------------------ | --------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| [`scripts/sendChannelMessage.ts`](scripts/sendChannelMessage.ts)   | `sendChannelMessage`  | `discord`   | Send a message to a channel, thread, or forum post; use `message_reference` to reply.           |
| [`scripts/sendDirectMessage.ts`](scripts/sendDirectMessage.ts)     | `sendDirectMessage`   | `discord`   | Open (or reuse) a DM channel with a user and post a message.                                    |
| [`scripts/editMessage.ts`](scripts/editMessage.ts)                 | `editMessage`         | `discord`   | Edit the content of a message the bot previously sent.                                          |
| [`scripts/deleteMessage.ts`](scripts/deleteMessage.ts)             | `deleteMessage`       | `discord`   | Delete a message (own, or others' with Manage Messages).                                        |
| [`scripts/addReaction.ts`](scripts/addReaction.ts)                 | `addReaction`         | `discord`   | Add the bot's reaction to a message (unicode char or custom `name:id`).                         |
| [`scripts/removeReaction.ts`](scripts/removeReaction.ts)           | `removeReaction`      | `discord`   | Remove the bot's own reaction from a message.                                                   |
| [`scripts/listChannelMessages.ts`](scripts/listChannelMessages.ts) | `listChannelMessages` | `discord`   | List recent messages in a channel or thread, newest first; page with `before`/`after`.          |
| [`scripts/getMessage.ts`](scripts/getMessage.ts)                   | `getMessage`          | `discord`   | Get a single message by id from a channel or thread.                                            |
| [`scripts/createThread.ts`](scripts/createThread.ts)               | `createThread`        | `discord`   | Start a thread — a forum post (pass `message`) or a standalone thread (omit it).                |
| [`scripts/listChannels.ts`](scripts/listChannels.ts)               | `listChannels`        | `discord`   | List all channels in a server; filter by `type` client-side (threads: use `listActiveThreads`). |
| [`scripts/getChannel.ts`](scripts/getChannel.ts)                   | `getChannel`          | `discord`   | Get a single channel or thread by id.                                                           |
| [`scripts/createChannel.ts`](scripts/createChannel.ts)             | `createChannel`       | `discord`   | Create a channel (text, voice, announcement, category, or forum). Requires Manage Channels.     |
| [`scripts/modifyChannel.ts`](scripts/modifyChannel.ts)             | `modifyChannel`       | `discord`   | Modify a channel's name and/or topic. Requires Manage Channels.                                 |
| [`scripts/listActiveThreads.ts`](scripts/listActiveThreads.ts)     | `listActiveThreads`   | `discord`   | List active (non-archived) threads and forum posts in a server.                                 |
| [`scripts/listMembers.ts`](scripts/listMembers.ts)                 | `listMembers`         | `discord`   | List members of a server, paginated by the `after` cursor.                                      |
| [`scripts/searchMembers.ts`](scripts/searchMembers.ts)             | `searchMembers`       | `discord`   | Search a server's members by username / nickname prefix.                                        |
| [`scripts/getMember.ts`](scripts/getMember.ts)                     | `getMember`           | `discord`   | Get a single server member by user id, with roles and nickname.                                 |
| [`scripts/addMemberRole.ts`](scripts/addMemberRole.ts)             | `addMemberRole`       | `discord`   | Add a role to a member. Requires Manage Roles and the bot's top role above the target.          |
| [`scripts/removeMemberRole.ts`](scripts/removeMemberRole.ts)       | `removeMemberRole`    | `discord`   | Remove a role from a member. Requires Manage Roles.                                             |
| [`scripts/listRoles.ts`](scripts/listRoles.ts)                     | `listRoles`           | `discord`   | List a server's roles, with ids, names, colors, and permission bitfields.                       |
| [`scripts/createRole.ts`](scripts/createRole.ts)                   | `createRole`          | `discord`   | Create a role in a server. Requires Manage Roles.                                               |
| [`scripts/listGuilds.ts`](scripts/listGuilds.ts)                   | `listGuilds`          | `discord`   | List the servers the bot belongs to — the entry point for resolving `guild_id`.                 |
| [`scripts/getGuild.ts`](scripts/getGuild.ts)                       | `getGuild`            | `discord`   | Get information about a server by id — name, owner, and metadata.                               |
| [`scripts/getCurrentUser.ts`](scripts/getCurrentUser.ts)           | `getCurrentUser`      | `discord`   | Get the bot's own identity and verify the token is valid.                                       |
| [`scripts/getUser.ts`](scripts/getUser.ts)                         | `getUser`             | `discord`   | Get a user's public profile by id.                                                              |
| [`scripts/listEmojis.ts`](scripts/listEmojis.ts)                   | `listEmojis`          | `discord`   | List a server's custom emojis, with the `name:id` form reactions and content need.              |
| [`scripts/listChannelWebhooks.ts`](scripts/listChannelWebhooks.ts) | `listChannelWebhooks` | `discord`   | List a channel's webhooks, with the id + token `executeWebhook` needs.                          |
| [`scripts/createWebhook.ts`](scripts/createWebhook.ts)             | `createWebhook`       | `discord`   | Create a webhook on a channel. Returns its id and token. Requires Manage Webhooks.              |
| [`scripts/executeWebhook.ts`](scripts/executeWebhook.ts)           | `executeWebhook`      | `discord`   | Post through a channel webhook, optionally as a custom username/avatar.                         |

## Disambiguation & refusals

This connector resolves names to ids, then writes. Two situations trip up an action-biased agent — handle both before you write.

**Before writing to a record you looked up by name** — count how many returned records match the name the user gave _exactly_ (case-insensitive). Common collisions: a **member** looked up via `searchMembers` / `listMembers` (two people share a display name), or a **channel** picked out of `listChannels` (two channels named `general`).

- **One exact match** (even among other fuzzy hits) → act on it. Don't ask for a confirmation you don't need.
- **Two or more that tie** → stop. List the tied candidates with a distinguishing field (id + username / nickname for members, id + `parent_id` / `type` for channels) and ask which one the user means. Never pick one yourself and write against it, and never write to all of them.

**Before fulfilling a request, check that a script actually does it.** This connector deliberately does **not**:

- **Moderate members** — no bans, kicks, or timeouts. There is no tool for it; removing a role (`removeMemberRole`) is not a substitute.
- **Upload files or attachments**, join voice, or subscribe to events / triggers (new-message, new-member, reactions as they happen). None of these have a tool here.

If asked for any of these, say plainly it's unsupported and stop. Don't substitute a different script and report success for an action you didn't perform.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The connector authenticates as a **bot** using a single static, long-lived token (there is no OAuth flow and nothing to refresh — the token changes only if you regenerate it). Behind the scenes the token is sent as an `Authorization: Bot <token>` header on every request. Every server-scoped tool takes an explicit `guild_id` because one bot token can span many servers; resolve it with `listGuilds`. Individual actions additionally require the bot to hold the matching Discord permission in the target server (Manage Messages / Roles / Channels / Webhooks) and, for role changes, a role positioned above the target role — these surface as runtime permission errors, not connection errors.

The single connection `discord` accepts two resolvers:

- **`zapier:<connection-id>`** — Zapier-managed auth. Routes through Zapier's auth, retries, and governance layer, which supplies the bot token per request; no token enters the agent's environment, and the connection id is not itself a secret.
- **`env:DISCORD_BOT_TOKEN`** — direct mode. Reads the bot token from the `DISCORD_BOT_TOKEN` environment variable (obtain it from your app's settings in the Discord Developer Portal). The token stays in `env`, never on argv.

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

| Reference                           | When to load                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `references/discord-api-gotchas.md` | Load when an API call errors or behaves unexpectedly — error codes, rate limits, snowflake/permission/intent quirks.            |
| `references/discord-formatting.md`  | Load when composing a message body or a reaction — markdown, mentions, `allowed_mentions`, the 2000-char limit, emoji encoding. |
