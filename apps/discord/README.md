# @zapier/discord-connector

<!-- BEGIN:readme-intro -->

Agent-callable Discord tools wrapping the [Discord API](https://docs.discord.com/developers/reference) (`https://discord.com/api/v10`). The connector authenticates as a **bot** added to one or more servers and covers the jobs an agent does day-to-day: send and manage messages, start threads and forum posts, create and edit channels, manage members and roles, post through channel webhooks, and read the servers, channels, members, roles, and emojis needed to resolve the ids those actions take. 29 scripts. Because one bot can belong to many servers, every server-scoped tool takes an explicit `guild_id` resolved via `listGuilds`. Auth is a single static bot token, resolved either from an environment variable (direct mode) or through a Zapier-managed connection.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Discord. Not affiliated with, endorsed by, or sponsored by Discord. "Discord" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

- The agent needs **authenticated** access to a real Discord server — send, edit, delete, and react to messages, start threads and forum posts, manage channels, administer members and roles, and DM users.
- The agent needs to **read and resolve** Discord resources — list the bot's servers, channels, active threads, members, roles, and custom emojis, and post through channel webhooks under a custom identity.
- You want one artifact that works as an MCP tool, a CLI, or an imported function — without re-implementing each surface.

<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Moderating members** — bans, kicks, and timeouts are not supported; there is no destructive-moderation tool here.
- **Uploading files or attachments, voice, or real-time events / triggers** — no attachment upload, no voice, and no event subscriptions (new-message, new-member, live reactions). This connector is request/response only.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/discord-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/discord-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill discord
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "discord": {
      "command": "npx",
      "args": ["@zapier/discord-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/discord
cd apps/discord && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script                | Description                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `sendChannelMessage`  | Send a message to a channel, thread, or forum post; use `message_reference` to reply.       |
| `sendDirectMessage`   | Open (or reuse) a DM channel with a user and post a message.                                |
| `editMessage`         | Edit the content of a message the bot previously sent.                                      |
| `deleteMessage`       | Delete a message (own, or others' with Manage Messages).                                    |
| `addReaction`         | Add the bot's reaction to a message (unicode char or custom `name:id`).                     |
| `removeReaction`      | Remove the bot's own reaction from a message.                                               |
| `listChannelMessages` | List recent messages in a channel or thread, newest first; page with `before`/`after`.      |
| `getMessage`          | Get a single message by id from a channel or thread.                                        |
| `createThread`        | Start a thread — a forum post (pass `message`) or a standalone thread (omit it).            |
| `listChannels`        | List all channels in a server; filter by `type` client-side.                                |
| `getChannel`          | Get a single channel or thread by id.                                                       |
| `createChannel`       | Create a channel (text, voice, announcement, category, or forum). Requires Manage Channels. |
| `modifyChannel`       | Modify a channel's name and/or topic. Requires Manage Channels.                             |
| `listActiveThreads`   | List active (non-archived) threads and forum posts in a server.                             |
| `listMembers`         | List members of a server, paginated by the `after` cursor.                                  |
| `searchMembers`       | Search a server's members by username / nickname prefix.                                    |
| `getMember`           | Get a single server member by user id, with roles and nickname.                             |
| `addMemberRole`       | Add a role to a member. Requires Manage Roles and the bot's top role above the target.      |
| `removeMemberRole`    | Remove a role from a member. Requires Manage Roles.                                         |
| `listRoles`           | List a server's roles, with ids, names, colors, and permission bitfields.                   |
| `createRole`          | Create a role in a server. Requires Manage Roles.                                           |
| `listGuilds`          | List the servers the bot belongs to — the entry point for resolving `guild_id`.             |
| `getGuild`            | Get information about a server by id — name, owner, and metadata.                           |
| `getCurrentUser`      | Get the bot's own identity and verify the token is valid.                                   |
| `getUser`             | Get a user's public profile by id.                                                          |
| `listEmojis`          | List a server's custom emojis, with the `name:id` form reactions and content need.          |
| `listChannelWebhooks` | List a channel's webhooks, with the id + token `executeWebhook` needs.                      |
| `createWebhook`       | Create a webhook on a channel. Returns its id and token. Requires Manage Webhooks.          |
| `executeWebhook`      | Post through a channel webhook, optionally as a custom username/avatar.                     |

<!-- END:readme-scripts-table -->

Run `npx @zapier/discord-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { sendChannelMessage } from "@zapier/discord-connector";

const { data, meta } = await sendChannelMessage(
  {
    channel_id: "1069283726352",
    content: "Deploy finished :white_check_mark:",
  },
  { connection: "env:DISCORD_BOT_TOKEN" },
);
```

Every script resolves to a `{ data, meta }` envelope: `data` is the script's result and `meta.outputDataValidation` reports what output validation did. Pass `{ skipOutputDataValidation: true }` as a run option to receive the raw, unvalidated output. See [`SKILL.md`](SKILL.md#output-format) for the full contract.
<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/discord)

<!-- BEGIN:readme-links-extra -->

- [Discord API reference](https://docs.discord.com/developers/reference)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Discord's API, services, data, schemas, documentation, or other materials, which remain the property of Discord. Your use of Discord's API is governed by your own agreement with Discord.

**Trademarks and affiliation.** Discord and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Discord.

**Your responsibility.** This connector calls Discord's API using credentials you supply. You are responsible for holding a valid Discord account, for complying with Discord's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Discord product. Zapier is not responsible for changes Discord makes to its API or for any consequence of your use of Discord's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
