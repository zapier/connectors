---
name: telegram
description: Agent-callable Telegram bot tools — send messages, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; resolve chats, members, and files. Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content — including requests that don't name Telegram explicitly, e.g. "message the team channel", "post this update to the group".
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/telegram/SKILL.md
  zapier-app-key: TelegramCLIAPI
  api-docs: https://core.telegram.org/bots/api
---

# Telegram

Tools for a Telegram bot, against the [Telegram Bot API](https://core.telegram.org/bots/api) (`https://api.telegram.org/bot<token>/<method>`). Send text, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; and resolve the chats, members, and files a bot interacts with. Every tool acts **as the bot** — the bot must be a member of any chat it messages, and a user must message the bot first before the bot can DM them.

## When to use this connector

- An agent needs a Telegram bot to **send** a message, photo, document, video, audio, location, contact, or poll to a chat.
- An agent needs to **manage** messages the bot sent — edit, delete, forward, copy, pin, or unpin.
- An agent needs to **resolve** a chat or member — find a `chat_id` (via `listRecentChats`), confirm a chat (`getChat`), check a member's role (`getChatMember`), or list admins.

## Scripts

| Script                                                                 | Default export          | Tool name               | Connections         | Description                                                     | Has dependent fields? |
| ---------------------------------------------------------------------- | ----------------------- | ----------------------- | ------------------- | --------------------------------------------------------------- | --------------------- |
| [`scripts/sendMessage.ts`](scripts/sendMessage.ts)                     | `sendMessage`           | `sendMessage`           | Single (`telegram`) | Send a text message to a chat.                                  | No                    |
| [`scripts/sendPhoto.ts`](scripts/sendPhoto.ts)                         | `sendPhoto`             | `sendPhoto`             | Single (`telegram`) | Send a photo by URL or file_id.                                 | No                    |
| [`scripts/sendDocument.ts`](scripts/sendDocument.ts)                   | `sendDocument`          | `sendDocument`          | Single (`telegram`) | Send a file/document by URL or file_id.                         | No                    |
| [`scripts/sendVideo.ts`](scripts/sendVideo.ts)                         | `sendVideo`             | `sendVideo`             | Single (`telegram`) | Send a video by URL or file_id.                                 | No                    |
| [`scripts/sendAudio.ts`](scripts/sendAudio.ts)                         | `sendAudio`             | `sendAudio`             | Single (`telegram`) | Send an audio file (music) by URL or file_id.                   | No                    |
| [`scripts/sendLocation.ts`](scripts/sendLocation.ts)                   | `sendLocation`          | `sendLocation`          | Single (`telegram`) | Send a point on the map.                                        | No                    |
| [`scripts/sendContact.ts`](scripts/sendContact.ts)                     | `sendContact`           | `sendContact`           | Single (`telegram`) | Send a phone contact.                                           | No                    |
| [`scripts/sendPoll.ts`](scripts/sendPoll.ts)                           | `sendPoll`              | `sendPoll`              | Single (`telegram`) | Send a poll or quiz.                                            | No                    |
| [`scripts/editMessageText.ts`](scripts/editMessageText.ts)             | `editMessageText`       | `editMessageText`       | Single (`telegram`) | Edit the text of a message the bot sent.                        | No                    |
| [`scripts/deleteMessage.ts`](scripts/deleteMessage.ts)                 | `deleteMessage`         | `deleteMessage`         | Single (`telegram`) | Delete a message from a chat.                                   | No                    |
| [`scripts/forwardMessage.ts`](scripts/forwardMessage.ts)               | `forwardMessage`        | `forwardMessage`        | Single (`telegram`) | Forward a message, keeping attribution.                         | No                    |
| [`scripts/copyMessage.ts`](scripts/copyMessage.ts)                     | `copyMessage`           | `copyMessage`           | Single (`telegram`) | Copy a message's content without attribution.                   | No                    |
| [`scripts/pinChatMessage.ts`](scripts/pinChatMessage.ts)               | `pinChatMessage`        | `pinChatMessage`        | Single (`telegram`) | Pin a message in a chat.                                        | No                    |
| [`scripts/unpinChatMessage.ts`](scripts/unpinChatMessage.ts)           | `unpinChatMessage`      | `unpinChatMessage`      | Single (`telegram`) | Unpin a message (or the most recent pin).                       | No                    |
| [`scripts/getMe.ts`](scripts/getMe.ts)                                 | `getMe`                 | `getMe`                 | Single (`telegram`) | Get the bot's identity and verify the token.                    | No                    |
| [`scripts/getChat.ts`](scripts/getChat.ts)                             | `getChat`               | `getChat`               | Single (`telegram`) | Get info about a chat by id or @username.                       | No                    |
| [`scripts/listRecentChats.ts`](scripts/listRecentChats.ts)             | `listRecentChats`       | `listRecentChats`       | Single (`telegram`) | List chats the bot recently interacted with (chat_id resolver). | No                    |
| [`scripts/getChatMember.ts`](scripts/getChatMember.ts)                 | `getChatMember`         | `getChatMember`         | Single (`telegram`) | Get a member's status and role in a chat.                       | No                    |
| [`scripts/getChatAdministrators.ts`](scripts/getChatAdministrators.ts) | `getChatAdministrators` | `getChatAdministrators` | Single (`telegram`) | List a chat's administrators.                                   | No                    |
| [`scripts/getChatMemberCount.ts`](scripts/getChatMemberCount.ts)       | `getChatMemberCount`    | `getChatMemberCount`    | Single (`telegram`) | Get the number of members in a chat.                            | No                    |
| [`scripts/getFile.ts`](scripts/getFile.ts)                             | `getFile`               | `getFile`               | Single (`telegram`) | Get a file's metadata and download path.                        | No                    |

Each tool's `inputSchema` / `outputSchema` (Zod) inside the script file is the source of truth for its contract. **Always learn a script's input contract before calling it** — run `--help` (see [Using this skill](#using-this-skill)) or read the script's `inputSchema`. Guessing field names or types just produces a `ZodError` and wastes a round-trip.

## Output format

Every script returns a `{ data, meta }` envelope (the same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

- **Resolve `chat_id` before sending; don't guess.** A `chat_id` is a numeric id (supergroups/channels are `-100`-prefixed) or a public `@username`. If the user names a chat you don't have an id for, resolve it with `listRecentChats` (chats that recently messaged the bot) or `getChat` (a known id/username). If `listRecentChats` returns two chats whose names tie on what the user said, stop and ask which one — list each with its `type` and id. If exactly one matches, act on it; don't over-ask.
- **The bot must be reachable.** A bot can only message chats it's a member of, and **cannot start a private chat** — the user must message the bot first. If a send fails with "bot can't initiate conversation" or "chat not found", say so and stop; don't retry against a different chat.
- **Declined operations.** This connector does not create/manage chats, ban or promote members, manage invite links, upload local files (provide an HTTPS URL or a Telegram `file_id` instead), or run games/payments. If asked for one of these, say it's unsupported — don't substitute another tool and report success for an action you didn't perform.

## Auth

A Telegram bot has one credential: the **bot token** issued by [@BotFather](https://core.telegram.org/bots/features#botfather) (send `/newbot`, or `/token` to regenerate). There is no OAuth and no scopes — the token grants full control of the bot. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a _selector_, not the secret.

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier-managed Telegram connection (`TELEGRAM_ZAPIER_CONNECTION_ID`). Zapier holds the bot token and injects it for each request; a bare UUID-shaped value auto-claims this resolver. Find the id with `npx @zapier/zapier-sdk-cli list-connections TelegramCLIAPI`.
- **`env:TELEGRAM_BOT_TOKEN`** _(direct)_ — read the bot token from the named environment variable. The connector places it in the request path as the Telegram API requires; the token stays in `env` and never touches argv. A bare `--connection TELEGRAM_BOT_TOKEN` auto-claims this once the var is set.

If no connection is passed the script fails with an actionable error listing the resolvers in match order.

## Using this skill

### 0. Pre-flight

Run the bundled pre-flight check **once** at the start of a session, then run scripts directly:

```bash
./preflight.sh
```

It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth. Read `PREFLIGHT_STATUS` first (the verdict token); `PREFLIGHT_RUNNER` names the runtime (`node` or `bun`); `PREFLIGHT_RECOMMENDATION` is the exact next command. On exit `1` (`NEEDS_ACTION`), follow the recommendation's single install step, then re-run `--help`.

### 1. Execute scripts directly

Each script is `chmod +x` with a Node shebang. Run `--help` first to see the input schema **and** which auth option is ready:

```bash
# Inspect the contract + auth status (the canonical first step)
./scripts/sendMessage.ts --help

# Direct token (token stays in env)
TELEGRAM_BOT_TOKEN=123:ABC ./scripts/sendMessage.ts '{"chat_id":"@my_channel","text":"Hello"}' --connection env:TELEGRAM_BOT_TOKEN

# Zapier-managed connection (recommended)
./scripts/getMe.ts '{}' --connection zapier:conn_xxx
```

`--help` prints the script's JSON-Schema input contract, annotates each connection's env vars as `[set]` / `[not set]`, marks the recommended auth option `[READY — use this]`, and lists optional packages with their install state. Match the runner to `PREFLIGHT_RUNNER` (use `bun`/`bunx` when it says `bun`).

### 2. Use the package's CLI

```bash
TELEGRAM_BOT_TOKEN=123:ABC npx @zapier/telegram-connector run sendMessage '{"chat_id":"@my_channel","text":"Hello"}' --connection env:TELEGRAM_BOT_TOKEN
npx @zapier/telegram-connector run sendMessage --help    # per-script schema + resolvers
```

Same scripts as (1), different entry point. Use `bunx` when `PREFLIGHT_RUNNER` is `bun`. If a sandbox blocks `npx`/`bunx`, fall back to (1).

### 3. Use as a recipe

When no shipped script matches the use case, read this `SKILL.md`, the `references/` files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the `"telegram"` connection; `connections.ts` attaches the resolver chain. Imitate that shape. Include a comment pointing back to this skill's source so a future agent can re-ground the code:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/telegram/SKILL.md
```

## API quirks worth knowing

<!-- references-table: filled by generate-references -->
