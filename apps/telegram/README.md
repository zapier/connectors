# @zapier/telegram-connector

_Independent, unofficial connector for Telegram. Not affiliated with, endorsed by, or sponsored by Telegram. "Telegram" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable scripts for a **Telegram bot**, wrapping the [Telegram Bot API](https://core.telegram.org/bots/api). Send messages, media (photo/document/video/audio), locations, contacts, and polls; edit, delete, forward, copy, and pin messages; and resolve the chats, members, and files a bot interacts with — 21 scripts in all. Every script acts as the bot (the bot must be a member of any chat it messages), and auth is a single bot token from [@BotFather](https://core.telegram.org/bots/features#botfather), supplied via the environment (direct) or a Zapier-managed connection (recommended). Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## When to use this

- A Telegram **bot** needs to send or manage messages in chats it belongs to — post updates/media/polls to a channel or group, edit/delete/pin its own messages, or forward/copy between chats.
- An agent needs to **resolve** a Telegram chat or member — discover a reachable `chat_id` (`listRecentChats`), confirm a chat (`getChat`), or read a chat's members/admins.

## When NOT to use this

- **Creating chats, or messaging a user who hasn't messaged the bot first** — Telegram bots can't create groups/channels or cold-DM users; a human must add the bot or start the chat. (Use the Telegram app for setup.)
- **Group moderation** (ban/restrict members, manage invite links) — not in this connector's v1 surface.
- **Uploading local-disk files** — media is sent by HTTPS URL or an existing Telegram `file_id`, not from a local path.

## Install

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/telegram-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/telegram-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill telegram
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["@zapier/telegram-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                  | Description                                                     |
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

Run `npx @zapier/telegram-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { sendMessage } from "@zapier/telegram-connector";

const { data } = await sendMessage(
  { chat_id: "@my_channel", text: "Deploy complete ✅" },
  { connection: "env:TELEGRAM_BOT_TOKEN" },
);
// data.message_id → the id of the sent message; meta.outputDataValidation reports any stripped fields.
```

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/telegram)
- [Telegram Bot API docs](https://core.telegram.org/bots/api)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Telegram's API, services, data, schemas, documentation, or other materials, which remain the property of Telegram. Your use of Telegram's API is governed by your own agreement with Telegram.

**Trademarks and affiliation.** Telegram and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Telegram.

**Your responsibility.** This connector calls Telegram's API using credentials you supply. You are responsible for holding a valid Telegram account, for complying with Telegram's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Telegram product. Zapier is not responsible for changes Telegram makes to its API or for any consequence of your use of Telegram's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
