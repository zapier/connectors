# Using Discord with direct credentials

This is the direct-auth path: you hold and pass Discord's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

<!-- BEGIN:use-without-zapier-getting-credentials -->

Discord authenticates every request with a **bot token**, sent as
`Authorization: Bot <token>` (the scheme word is `Bot`, not `Bearer`). Bot users
"have full access to most API routes without using bearer tokens," and the token
is static — no OAuth refresh cycle. ([API Reference](https://docs.discord.com/developers/reference))

1. **Create an application + bot.** In the [Discord Developer Portal](https://discord.com/developers/applications),
   create a new application, then open its **Bot** page. A bot user is added
   automatically; the bot token lives on that Bot page. Copy the token there and
   keep it secret — it's the full credential. ([API Reference](https://docs.discord.com/developers/reference))

2. **Enable the Server Members intent (needed for `listMembers` / `searchMembers`).**
   Still on the **Bot** page, toggle on the privileged **Server Members Intent**.
   `GUILD_MEMBERS` is a privileged intent, and "before you can specify any of
   these privileged intents … you must enable the specific privileged intents you
   need in the Developer Portal." Member-listing tools return nothing without it.
   ([Gateway](https://docs.discord.com/developers/events/gateway))

3. **Add the bot to a server.** A bot only sees servers it has been added to.
   Build an OAuth2 authorize URL with the `bot` scope and the permissions the bot
   needs, e.g.
   `https://discord.com/oauth2/authorize?client_id=<YOUR_CLIENT_ID>&scope=bot&permissions=<BITFIELD>`,
   open it, and pick the target server (you need the proper permissions in that
   server to add it). `permissions` is "an integer corresponding to the permission
   calculations for the bot." ([OAuth2](https://docs.discord.com/developers/topics/oauth2))

<!-- END:use-without-zapier-getting-credentials -->

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

<!-- BEGIN:use-without-zapier-passing-credential -->

This connector's direct resolver reads the bot token from an environment
variable and emits the `Authorization: Bot <token>` header for you — pass
`env:<VAR_NAME>`, e.g. `--connection env:DISCORD_BOT_TOKEN`.
<!-- END:use-without-zapier-passing-credential -->

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
