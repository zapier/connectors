# Using Alpaca with direct credentials

This is the direct-auth path: you hold and pass Alpaca's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Alpaca authenticates with a two-part credential — an **API Key ID** and a **Secret Key** — sent as the `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY` headers ([Authentication](https://docs.alpaca.markets/docs/authentication)). Generate and manage the pair from your Alpaca account; see Alpaca's [Credentials Management](https://docs.alpaca.markets/docs/credential-management) guide for the exact steps.

**Paper and live accounts have separate keys** — "Your paper trading account will have a different API key from your live account" ([Paper Trading](https://docs.alpaca.markets/us/docs/paper-trading)). This connector defaults to Alpaca's paper (simulated) environment; enabling live trading is an explicit opt-in (see [Passing the credential](#passing-the-credential) below and [`SKILL.md`](../SKILL.md#auth)).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector reads the direct credential from an **env-prefix resolver named `alpaca`**: set `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY` in the environment — the key/secret pair is read from those two variables rather than an inline `<resolver>:<value>` string. The resolver injects the `APCA-API-KEY-ID` / `APCA-API-SECRET-KEY` headers and routes the request host for you.

Trading runs against the **paper** host by default. To enable live, real-money order tools, set `ALPACA_TRADING_ENV=live` **and** `ALPACA_ALLOW_LIVE_TRADING=true`; reads and paper mode never require this opt-in.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
