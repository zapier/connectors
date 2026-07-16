# Using Runway with direct credentials

This is the direct-auth path: you hold and pass Runway's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Runway uses a single **API secret** — a bearer token scoped to your Runway organization; there is no per-tool token, OAuth flow, or scope split. Get one from the Runway Developer Portal (<https://dev.runwayml.com>):

1. Sign up or log in, then create an organization — Runway's docs describe an organization as "your integration," holding your API keys and configuration.
2. Open the **API Keys** tab in the organization dashboard and create a new key, giving it a descriptive name.
3. Copy it immediately: Runway shows the key **once**, in plaintext, and never displays it again. Store it in a password manager or secret store, not a chat transcript.
4. Add credits under the **Billing** tab before your first call — Runway requires a minimum $10 payment (at $0.01/credit) to fund generations; an otherwise-valid key with a zero balance still fails.

The same key authorizes every endpoint this connector calls.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's only direct-token resolver is `env:<ENV_VAR>` (an `env` token resolver, default name and placeholder) — read the credential from an environment variable you choose, e.g. `--connection env:RUNWAY_API_KEY` with the key exported in `RUNWAY_API_KEY`. The connector sends it as `Authorization: Bearer <key>`.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
