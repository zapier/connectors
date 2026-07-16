# Using Telegram with direct credentials

This is the direct-auth path: you hold and pass Telegram's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

A Telegram bot has one credential: the **bot token**, issued by [@BotFather](https://core.telegram.org/bots/features#botfather) — Telegram's own bot for managing bots, at `t.me/BotFather`. There is no OAuth flow and no separate scopes; the token alone grants full control of the bot.

- Message `@BotFather` and send `/newbot`. It asks for a display name (shown in contact details) and a username (5-32 characters, Latin letters/numbers/underscores, must end in `bot`, e.g. `my_cool_bot`) — usernames can't be changed later, names can.
- BotFather replies with the token, a string shaped like `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` (a numeric bot id, a colon, then an alphanumeric secret). Store it immediately — it's the only credential and Telegram doesn't show it again.
- If the token is ever lost or compromised, send `/token` to BotFather to regenerate it (this invalidates the old one). `/mybots` lists and manages bots you've already created.
- The bot must also be added to (or messaged first in) any chat it should act in — see `SKILL.md`'s `## Disambiguation & refusals` for that reachability requirement; it's unrelated to the credential itself.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct resolver is **`env:<ENV_VAR>`** — a single environment variable holding the bot token, e.g. `export TELEGRAM_BOT_TOKEN=xxx` then `--connection env:TELEGRAM_BOT_TOKEN`. The resolver substitutes the token into the `{{bot_token}}` placeholder in the request URL's path (`https://api.telegram.org/bot{{bot_token}}/<method>` — Telegram's own convention; the token rides in the path, not a header), so the token stays in `env` and never touches argv or logs. A bare value (no `env:` prefix) auto-claims this resolver once the named var is set.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
