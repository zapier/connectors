# @zapier/telegram-connector

_Independent, unofficial connector for Telegram. Not affiliated with, endorsed by, or sponsored by Telegram. "Telegram" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for a **Telegram bot**, wrapping the [Telegram Bot API](https://core.telegram.org/bots/api). Send messages, media (photo/document/video/audio), locations, contacts, and polls; edit, delete, forward, copy, and pin messages; and resolve the chats, members, and files a bot interacts with — 21 tools in all. Every tool acts as the bot (the bot must be a member of any chat it messages), and auth is a single bot token from [@BotFather](https://core.telegram.org/bots/features#botfather), supplied via the environment (direct) or a Zapier-managed connection (recommended). Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
TELEGRAM_BOT_TOKEN=xxx npx @zapier/telegram-connector run sendMessage '{"chat_id":"@my_channel","text":"Hello"}' --connection env:TELEGRAM_BOT_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/telegram-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill telegram
```

Credentials are environment-variable only (never passed on argv). Use `TELEGRAM_ZAPIER_CONNECTION_ID=<id>` with `--connection zapier:<id>` instead of `TELEGRAM_BOT_TOKEN` to route through Zapier-managed auth (recommended; no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

| Tool                    | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `sendMessage`           | Send a text message to a chat.                                  |
| `sendPhoto`             | Send a photo by URL or file_id.                                 |
| `sendDocument`          | Send a file/document by URL or file_id.                         |
| `sendVideo`             | Send a video by URL or file_id.                                 |
| `sendAudio`             | Send an audio file (music) by URL or file_id.                   |
| `sendLocation`          | Send a point on the map.                                        |
| `sendContact`           | Send a phone contact.                                           |
| `sendPoll`              | Send a poll or quiz.                                            |
| `editMessageText`       | Edit the text of a message the bot sent.                        |
| `deleteMessage`         | Delete a message from a chat.                                   |
| `forwardMessage`        | Forward a message, keeping attribution.                         |
| `copyMessage`           | Copy a message's content without attribution.                   |
| `pinChatMessage`        | Pin a message in a chat.                                        |
| `unpinChatMessage`      | Unpin a message (or the most recent pin).                       |
| `getMe`                 | Get the bot's identity and verify the token.                    |
| `getChat`               | Get info about a chat by id or @username.                       |
| `listRecentChats`       | List chats the bot recently interacted with (chat_id resolver). |
| `getChatMember`         | Get a member's status and role in a chat.                       |
| `getChatAdministrators` | List a chat's administrators.                                   |
| `getChatMemberCount`    | Get the number of members in a chat.                            |
| `getFile`               | Get a file's metadata and download path.                        |

Run `npx @zapier/telegram-connector run sendMessage --help` (or any tool name) to see a tool's exact input contract + which auth env vars are set.

## Usage

```ts
import { sendMessage } from "@zapier/telegram-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await sendMessage(
  { chat_id: "@my_channel", text: "Deploy complete ✅" },
  { connection: "env:TELEGRAM_BOT_TOKEN" },
);
// data.message_id → the id of the sent message; meta.outputDataValidation reports any stripped fields.
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["@zapier/telegram-connector", "mcp"],
      "env": {
        "TELEGRAM_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `TELEGRAM_ZAPIER_CONNECTION_ID` for `TELEGRAM_BOT_TOKEN` if you don't have a Zapier account.

## When to use this

- A Telegram **bot** needs to send or manage messages in chats it belongs to — post updates/media/polls to a channel or group, edit/delete/pin its own messages, or forward/copy between chats.
- An agent needs to **resolve** a Telegram chat or member — discover a reachable `chat_id` (`listRecentChats`), confirm a chat (`getChat`), or read a chat's members/admins.

## When NOT to use this

- **Creating chats, or messaging a user who hasn't messaged the bot first** — Telegram bots can't create groups/channels or cold-DM users; a human must add the bot or start the chat. (Use the Telegram app for setup.)
- **Group moderation** (ban/restrict members, manage invite links) — not in this connector's v1 surface.
- **Uploading local-disk files** — media is sent by HTTPS URL or an existing Telegram `file_id`, not from a local path.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Telegram Bot API docs](https://core.telegram.org/bots/api)
- [Source](https://github.com/zapier/connectors/tree/main/apps/telegram)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Telegram's API, services, data, schemas, documentation, or other materials, which remain the property of Telegram. Your use of Telegram's API is governed by your own agreement with Telegram.

**Trademarks and affiliation.** Telegram and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Telegram.

**Your responsibility.** This connector calls Telegram's API using credentials you supply. You are responsible for holding a valid Telegram account, for complying with Telegram's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Telegram product. Zapier is not responsible for changes Telegram makes to its API or for any consequence of your use of Telegram's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
