---
name: telegram
description: Agent-callable Telegram bot tools — send messages, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; resolve chats, members, and files. Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content — including requests that don't name Telegram explicitly, e.g. "message the team channel", "post this update to the group".
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
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

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill telegram` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                       | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__telegram__<tool>`), or you can register a local server yourself (or guide the user to)              | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                 | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                        | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Telegram Bot API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

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

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

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

## Disambiguation & refusals

- **Resolve `chat_id` before sending; don't guess.** A `chat_id` is a numeric id (supergroups/channels are `-100`-prefixed) or a public `@username`. If the user names a chat you don't have an id for, resolve it with `listRecentChats` (chats that recently messaged the bot) or `getChat` (a known id/username). If `listRecentChats` returns two chats whose names tie on what the user said, stop and ask which one — list each with its `type` and id. If exactly one matches, act on it; don't over-ask.
- **The bot must be reachable.** A bot can only message chats it's a member of, and **cannot start a private chat** — the user must message the bot first. If a send fails with "bot can't initiate conversation" or "chat not found", say so and stop; don't retry against a different chat.
- **Declined operations.** This connector does not create/manage chats, ban or promote members, manage invite links, upload local files (provide an HTTPS URL or a Telegram `file_id` instead), or run games/payments. If asked for one of these, say it's unsupported — don't substitute another tool and report success for an action you didn't perform.

## References

Load the matching reference file before working in that area:

| Reference                                                                | Covers                                                                                                                                                                                                                              | Load it when                                                                                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/telegram-api-gotchas.md](references/telegram-api-gotchas.md) | HTML vs MarkdownV2 escaping, file URL size limits, `getFile` 1-hour links, copying vs forwarding, deleting/pinning messages, building polls, `ok:false`/`error_code`/`retry_after`/`migrate_to_chat_id` error envelope, rate limits | Before sending formatted text, uploading/downloading files, copying vs forwarding, deleting/pinning messages, building polls, or handling API errors and rate limits. |
