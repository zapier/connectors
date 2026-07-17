# Using Heygen with direct credentials

This is the direct-auth path: you hold and pass Heygen's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

HeyGen authenticates with a **long-lived API key**, sent as the `X-Api-Key` header — one key authorizes the whole catalog (no per-tool token, OAuth flow, or scope split). Go to the HeyGen API dashboard (<https://app.heygen.com/home?nav=API>), generate your key, and rotate it periodically from the same dashboard. Note the billing difference between this path and the Zapier-managed one — see [`SKILL.md`](../SKILL.md#auth).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct resolver is `env:HEYGEN_API_KEY`: it reads the key from the `HEYGEN_API_KEY` environment variable and sends it as the `X-Api-Key` header. So the connection string is `env:HEYGEN_API_KEY` (a bare value routes to it too). Run any script's `--help` to confirm.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
