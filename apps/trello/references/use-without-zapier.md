# Using Trello with direct credentials

This is the direct-auth path: you hold and pass Trello's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Trello's direct-auth credential is two values — an API key and a token — from Trello's own developer console, not a Zapier-issued secret:

1. Log in to Trello, go to the [Power-Ups admin portal](https://trello.com/power-ups/admin), click **New** to register a Power-Up (any placeholder name/workspace works — this is just a container for the key), then open its **API Key** tab and generate an API key.
2. Mint a token by visiting Trello's authorize endpoint in a browser with that key: `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=<apiKey>`. After granting access, the token is shown on the confirmation page. Adjust `scope` (comma-separated: `read`, `write`, `account` — `account` is only needed to read member emails) and `expiration` (`1hour`, `1day`, `30days`, or `never`) to fit; this connector's scripts need at least `read,write`.
3. The key identifies the app and is not particularly sensitive; the token grants full access to the account that authorized it and must be treated as the real secret — see [`references/trello-api-gotchas.md`](trello-api-gotchas.md#auth--tokens) for how Trello treats each and what a revoked token looks like.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

Trello's direct-token resolver is `env:<ENV_VAR_PREFIX>` — a **prefix**, not a single variable: it reads both `<ENV_VAR_PREFIX>_API_KEY` (the key from step 1 above) and `<ENV_VAR_PREFIX>_TOKEN` (the token from step 2), and both are required. It builds the `Authorization: OAuth oauth_consumer_key="…", oauth_token="…"` header Trello's OAuth 1.0a expects from the two — e.g. `export TRELLO_API_KEY=xxx TRELLO_TOKEN=yyy` then `--connection env:TRELLO` (or your shape's equivalent).

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
