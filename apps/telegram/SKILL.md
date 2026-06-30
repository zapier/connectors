---
name: telegram
description: Agent-callable Telegram bot tools — send messages, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; resolve chats, members, and files. Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content — including requests that don't name Telegram explicitly, e.g. "message the team channel", "post this update to the group".
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  title: Telegram
  source: https://github.com/zapier/connectors/blob/main/apps/telegram/SKILL.md
  zapier-app-key: TelegramCLIAPI
  api-docs: https://core.telegram.org/bots/api
---

# Telegram

_Independent, unofficial connector for Telegram. Not affiliated with, endorsed by, or sponsored by Telegram. "Telegram" is a trademark of its owner, used only to identify the service this connector works with._

Scripts for a Telegram bot, against the [Telegram Bot API](https://core.telegram.org/bots/api) (`https://api.telegram.org/bot<token>/<method>`). Send text, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; and resolve the chats, members, and files a bot interacts with. Every script acts **as the bot** — the bot must be a member of any chat it messages, and a user must message the bot first before the bot can DM them.

## When to use this

- An agent needs a Telegram bot to **send** a message, photo, document, video, audio, location, contact, or poll to a chat.
- An agent needs to **manage** messages the bot sent — edit, delete, forward, copy, pin, or unpin.
- An agent needs to **resolve** a chat or member — find a `chat_id` (via `listRecentChats`), confirm a chat (`getChat`), check a member's role (`getChatMember`), or list admins.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__telegram__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill telegram` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use a single `telegram` connection.

| Script                                                                 | Script name             | Connections         | Description                                                     |
| ---------------------------------------------------------------------- | ----------------------- | ------------------- | --------------------------------------------------------------- |
| [`scripts/sendMessage.ts`](scripts/sendMessage.ts)                     | `sendMessage`           | Single (`telegram`) | Send a text message to a chat.                                  |
| [`scripts/sendPhoto.ts`](scripts/sendPhoto.ts)                         | `sendPhoto`             | Single (`telegram`) | Send a photo by URL or file_id.                                 |
| [`scripts/sendDocument.ts`](scripts/sendDocument.ts)                   | `sendDocument`          | Single (`telegram`) | Send a file/document by URL or file_id.                         |
| [`scripts/sendVideo.ts`](scripts/sendVideo.ts)                         | `sendVideo`             | Single (`telegram`) | Send a video by URL or file_id.                                 |
| [`scripts/sendAudio.ts`](scripts/sendAudio.ts)                         | `sendAudio`             | Single (`telegram`) | Send an audio file (music) by URL or file_id.                   |
| [`scripts/sendLocation.ts`](scripts/sendLocation.ts)                   | `sendLocation`          | Single (`telegram`) | Send a point on the map.                                        |
| [`scripts/sendContact.ts`](scripts/sendContact.ts)                     | `sendContact`           | Single (`telegram`) | Send a phone contact.                                           |
| [`scripts/sendPoll.ts`](scripts/sendPoll.ts)                           | `sendPoll`              | Single (`telegram`) | Send a poll or quiz.                                            |
| [`scripts/editMessageText.ts`](scripts/editMessageText.ts)             | `editMessageText`       | Single (`telegram`) | Edit the text of a message the bot sent.                        |
| [`scripts/deleteMessage.ts`](scripts/deleteMessage.ts)                 | `deleteMessage`         | Single (`telegram`) | Delete a message from a chat.                                   |
| [`scripts/forwardMessage.ts`](scripts/forwardMessage.ts)               | `forwardMessage`        | Single (`telegram`) | Forward a message, keeping attribution.                         |
| [`scripts/copyMessage.ts`](scripts/copyMessage.ts)                     | `copyMessage`           | Single (`telegram`) | Copy a message's content without attribution.                   |
| [`scripts/pinChatMessage.ts`](scripts/pinChatMessage.ts)               | `pinChatMessage`        | Single (`telegram`) | Pin a message in a chat.                                        |
| [`scripts/unpinChatMessage.ts`](scripts/unpinChatMessage.ts)           | `unpinChatMessage`      | Single (`telegram`) | Unpin a message (or the most recent pin).                       |
| [`scripts/getMe.ts`](scripts/getMe.ts)                                 | `getMe`                 | Single (`telegram`) | Get the bot's identity and verify the token.                    |
| [`scripts/getChat.ts`](scripts/getChat.ts)                             | `getChat`               | Single (`telegram`) | Get info about a chat by id or @username.                       |
| [`scripts/listRecentChats.ts`](scripts/listRecentChats.ts)             | `listRecentChats`       | Single (`telegram`) | List chats the bot recently interacted with (chat_id resolver). |
| [`scripts/getChatMember.ts`](scripts/getChatMember.ts)                 | `getChatMember`         | Single (`telegram`) | Get a member's status and role in a chat.                       |
| [`scripts/getChatAdministrators.ts`](scripts/getChatAdministrators.ts) | `getChatAdministrators` | Single (`telegram`) | List a chat's administrators.                                   |
| [`scripts/getChatMemberCount.ts`](scripts/getChatMemberCount.ts)       | `getChatMemberCount`    | Single (`telegram`) | Get the number of members in a chat.                            |
| [`scripts/getFile.ts`](scripts/getFile.ts)                             | `getFile`               | Single (`telegram`) | Get a file's metadata and download path.                        |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

A Telegram bot has one credential: the **bot token** issued by [@BotFather](https://core.telegram.org/bots/features#botfather) (send `/newbot`, or `/token` to regenerate). There is no OAuth and no scopes — the token grants full control of the bot.

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier-managed Telegram connection (`TELEGRAM_ZAPIER_CONNECTION_ID`). Zapier holds the bot token and injects it for each request; a bare UUID-shaped value auto-claims this resolver. Find the id with `npx @zapier/zapier-sdk-cli list-connections TelegramCLIAPI`.
- **`env:TELEGRAM_BOT_TOKEN`** _(direct)_ — read the bot token from the named environment variable. The connector places it in the request path as the Telegram API requires; the token stays in `env` and never touches argv. A bare `--connection TELEGRAM_BOT_TOKEN` auto-claims this once the var is set.

If no connection is passed the script fails with an actionable error listing the resolvers in match order.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
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

- **Resolve `chat_id` before sending; don't guess.** A `chat_id` is a numeric id (supergroups/channels are `-100`-prefixed) or a public `@username`. If the user names a chat you don't have an id for, resolve it with `listRecentChats` (chats that recently messaged the bot) or `getChat` (a known id/username). If `listRecentChats` returns two chats whose names tie on what the user said, stop and ask which one — list each with its `type` and id. If exactly one matches, act on it; don't over-ask.
- **The bot must be reachable.** A bot can only message chats it's a member of, and **cannot start a private chat** — the user must message the bot first. If a send fails with "bot can't initiate conversation" or "chat not found", say so and stop; don't retry against a different chat.
- **Declined operations.** This connector does not create/manage chats, ban or promote members, manage invite links, upload local files (provide an HTTPS URL or a Telegram `file_id` instead), or run games/payments. If asked for one of these, say it's unsupported — don't substitute another tool and report success for an action you didn't perform.

## API quirks worth knowing

| Reference                                                                | When to load                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/telegram-api-gotchas.md](references/telegram-api-gotchas.md) | Before sending formatted text (HTML vs MarkdownV2 escaping), uploading/downloading files (URL size limits, `getFile` 1-hour links), copying vs forwarding, deleting/pinning messages, building polls, or handling the `ok:false`/`error_code`/`retry_after`/`migrate_to_chat_id` error envelope and rate limits. |
