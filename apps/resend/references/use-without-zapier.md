# Using Resend with direct credentials

This is the direct-auth path: you hold and pass Resend's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Resend authenticates with a single API key (no OAuth). Create one in the dashboard at [resend.com/api-keys](https://resend.com/api-keys). When you create the key you choose:

- **Permission** — **Full access** ("Can create, delete, get, and update any resource") or **Sending access** ("Can only send emails"). Only `sendEmail` works with a sending-access key; contacts, segments, domains, and broadcasts require a full-access key. ([create API key](https://resend.com/docs/api-reference/api-keys/create-api-key))
- **Domain** — optionally restrict the key to a single sending domain.

The key is shown once — "You cannot view or edit an API Key value after it has been created" ([API keys](https://resend.com/docs/dashboard/api-keys/introduction)) — so copy it immediately. It has the form `re_…` and is sent as `Authorization: Bearer re_…`.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector resolves the key from an environment variable (the standard env-token resolver). Set your `re_…` key in the environment and the scripts pick it up automatically; pass an explicit `env:<VAR_NAME>` string only if you store it under a non-default variable name. Run a script with `--help` to see the exact variable it reads.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
