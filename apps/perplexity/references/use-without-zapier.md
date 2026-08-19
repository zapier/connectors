# Using Perplexity with direct credentials

This is the direct-auth path: you hold and pass Perplexity's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

<!-- BEGIN:use-without-zapier-getting-credentials -->

Perplexity uses a single API key with a bearer token — there is no OAuth flow. To get one:

1. Sign in to the Perplexity API Console (`console.perplexity.ai`).
2. **Create an API group first.** You cannot generate any key until an API group exists — create one from the group settings page in the console (name it e.g. "Production" or "Development").
3. Open the **API Keys** page in the console and generate a key. Keys are formatted like `pplx-...`.
4. **Copy the key immediately.** The full value is shown only once at creation and cannot be retrieved again from the console or any endpoint — if you lose it, revoke it and mint a new one. Give each key a descriptive name so you can identify it later (the name is all that's visible after creation).

Billing is pay-as-you-go with no subscription required; rate limits scale with your usage tier (see [`perplexity-api-gotchas.md`](perplexity-api-gotchas.md)). No scopes to configure — one key grants access to the Agent, Search, and Models endpoints this connector uses.
<!-- END:use-without-zapier-getting-credentials -->

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

<!-- BEGIN:use-without-zapier-passing-credential -->

This connector has one connection, `perplexity`, and beyond the Zapier connection resolver it accepts a direct **env-token resolver**. Put your key in an environment variable — the convention is `PERPLEXITY_API_KEY` — and pass the connection as `env:PERPLEXITY_API_KEY`:

```
--connection env:PERPLEXITY_API_KEY
```

The resolver reads the key from that environment variable at run time; the value never appears on the command line or in the connection string.
<!-- END:use-without-zapier-passing-credential -->

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
