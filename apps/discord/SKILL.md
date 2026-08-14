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

<!-- BEGIN:skill-intro -->

Agent-callable tools for a Discord server, running against the [Discord API](https://docs.discord.com/developers/reference) (`https://discord.com/api/v10`). The connector authenticates as a **bot** added to one or more servers: send and manage messages, start threads and forum posts, create and edit channels, manage members and roles, post through channel webhooks, and read the servers, channels, members, roles, and emojis an agent needs to resolve the ids those actions take. 29 scripts. Because a single bot can belong to many servers, every server-scoped tool takes an explicit `guild_id` (a server id), which you resolve with `listGuilds`.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Discord. Not affiliated with, endorsed by, or sponsored by Discord. "Discord" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- An agent needs to **send or manage messages** — post to a channel, thread, or forum post, reply, edit or delete a message, add or remove reactions, or DM a user.
- An agent needs to **manage threads and channels** — start a forum post or standalone thread, create a channel, rename or re-topic one, and list channels or active threads.
- An agent needs to **administer members and roles** — list, search, or read members, add or remove roles, and list or create roles.
- An agent needs to **read servers and resolve ids** — list the bot's servers, read a server / user / member, list custom emojis, and post via channel webhooks under a custom identity.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill discord` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                  | Load                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__discord__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                            | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                   | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Discord API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All 29 scripts use the single connection `discord` (a bot token). Server-scoped tools take an explicit `guild_id` — resolve it with `listGuilds` first. Every other required id has a resolver: `channel_id` ← `listChannels`, `user_id` ← `listMembers` / `searchMembers`, `role_id` ← `listRoles`, custom emoji ← `listEmojis`, `message_id` ← `listChannelMessages`, and `webhook_id` / `webhook_token` ← `createWebhook` / `listChannelWebhooks`.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

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

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

This connector resolves names to ids, then writes. Two situations trip up an action-biased agent — handle both before you write.

**Before writing to a record you looked up by name** — count how many returned records match the name the user gave _exactly_ (case-insensitive). Common collisions: a **member** looked up via `searchMembers` / `listMembers` (two people share a display name), or a **channel** picked out of `listChannels` (two channels named `general`).

- **One exact match** (even among other fuzzy hits) → act on it. Don't ask for a confirmation you don't need.
- **Two or more that tie** → stop. List the tied candidates with a distinguishing field (id + username / nickname for members, id + `parent_id` / `type` for channels) and ask which one the user means. Never pick one yourself and write against it, and never write to all of them.

**Before fulfilling a request, check that a script actually does it.** This connector deliberately does **not**:

- **Moderate members** — no bans, kicks, or timeouts. There is no tool for it; removing a role (`removeMemberRole`) is not a substitute.
- **Upload files or attachments**, join voice, or subscribe to events / triggers (new-message, new-member, reactions as they happen). None of these have a tool here.

If asked for any of these, say plainly it's unsupported and stop. Don't substitute a different script and report success for an action you didn't perform.

**Every server-scoped tool takes an explicit `guild_id`** because one bot token can span many servers — resolve it with `listGuilds` first. Individual actions additionally require the bot to hold the matching Discord permission in the target server (Manage Messages / Roles / Channels / Webhooks) and, for role changes, a role positioned above the target role — these surface as runtime permission errors, not connection errors, so a failure here doesn't mean the connection is broken.
<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes? operational behavior that differs by WHICH resolver is used — a safety gate only one path enforces, scopes/permissions that differ between resolvers, a billing/plan difference tied to the auth path, or a feature only available (or unavailable) on one resolver. Not for describing how to obtain or pass a credential — that's references/use-without-zapier.md's job. Leave this region empty (unfilled) if every resolver behaves identically. -->
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

Load the matching reference file before working in that area:

| Reference                           | When to load                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `references/discord-api-gotchas.md` | Load when an API call errors or behaves unexpectedly — error codes, rate limits, snowflake/permission/intent quirks.            |
| `references/discord-formatting.md`  | Load when composing a message body or a reaction — markdown, mentions, `allowed_mentions`, the 2000-char limit, emoji encoding. |

<!-- END:skill-references-table -->
