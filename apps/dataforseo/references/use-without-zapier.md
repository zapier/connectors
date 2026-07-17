# Using DataForSEO with direct credentials

This is the direct-auth path: you hold and pass DataForSEO's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

DataForSEO auth is HTTP Basic, not OAuth or a single API key. You need two values, both from your DataForSEO dashboard's **API access** page:

- **Login** — your account email.
- **API password** — a dedicated password generated there, distinct from your account/dashboard password.

There are no scopes or bot-vs-user token distinctions; a credential carries your account's full API access, metered by credit balance (check with `getAccountBalance`).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct resolver is `env:<PREFIX>`: set `<PREFIX>_LOGIN` (your login email) and `<PREFIX>_PASSWORD` (your API password) — e.g. `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` with `--connection env:DATAFORSEO` — and it sends `Authorization: Basic base64(login:password)`.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
