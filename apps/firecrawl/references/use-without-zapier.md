# Using Firecrawl with direct credentials

This is the direct-auth path: you hold and pass Firecrawl's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

<!-- BEGIN:use-without-zapier-getting-credentials -->

Firecrawl authenticates with a single **API key**, not OAuth. Create an account and mint a key from the dashboard at [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) — the same page the API's `401` remedy points to ("send `Authorization: Bearer fc-...` with a valid key from the [dashboard](https://www.firecrawl.dev/app/api-keys)", per the [Errors](https://docs.firecrawl.dev/api-reference/errors) catalog).

- The key is **`fc-`-prefixed** and is sent as a bearer token: `Authorization: Bearer fc-...` (see the [API auth intro](https://docs.firecrawl.dev/api-reference/introduction)). A single key carries the account's identity; there is no bot-vs-user token distinction.
- A brand-new key comes with a free credit allotment; signing up "get[s] 1,000 credits and higher rate limits at no cost" ([Rate Limits](https://docs.firecrawl.dev/rate-limits)).
- Keys are **team-scoped**: rate-limit and credit counters are shared across every key on the same team, and some features/endpoints are gated by plan (a valid key can still get `403` for a feature its plan doesn't include). Which key is valid for which operation, and the credit/token model, live in [`firecrawl-api-gotchas.md`](firecrawl-api-gotchas.md) (§ Authentication, § Credits & billing) — one home per claim.

<!-- END:use-without-zapier-getting-credentials -->

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

<!-- BEGIN:use-without-zapier-passing-credential -->

This connector's `firecrawl` connection exposes one direct-token resolver, `env:<VAR>` (from `defineEnvTokenResolver()` in `connections.ts`): set your `fc-` key in an environment variable and reference that variable by name in the connection string. For example, put the key in `FIRECRAWL_API_KEY` and pass `env:FIRECRAWL_API_KEY` — the value is read from the environment, never inlined. Any variable name works; `env:` just names which environment variable holds the key.

The connection also lists a Zapier-managed resolver as an alternative — that path is covered in [`use-with-zapier.md`](use-with-zapier.md), not here.
<!-- END:use-without-zapier-passing-credential -->

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
