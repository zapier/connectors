# Using Clay with direct credentials

This is the direct-auth path: you hold and pass Clay's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Clay has no OAuth app registration flow — a credential here is a plain API key, minted from a Clay account (there's no separate developer-app step first).

Sign in at [clay.com](https://www.clay.com), then go to **Settings → Account → API keys** and create one. There are no scopes or bot-vs-user token distinctions; a key carries your account's full API access.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's `clay` connection accepts one direct-token resolver: **`env:<ENV_VAR>`** — `<ENV_VAR>` names an environment variable holding the raw Clay API key; the connector sends it as the raw value of the `authorization` header (no `Bearer` prefix, no scheme). `CLAY_API_KEY` is the conventional name, but any env-var name works. Direct mode is the recommended, verified path for v1.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
