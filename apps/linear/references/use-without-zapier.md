# Using Linear with direct credentials

This is the direct-auth path: you hold and pass Linear's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Linear supports two credential types ([Getting started](https://linear.app/developers/graphql#authentication)):

**Personal API key** (simplest, for your own scripts). Mint one in Linear under
**Security & access** settings: "For personal scripts API keys are the easiest
way to access the API. Visit [Security & access](https://linear.app/settings/account/security)
settings to create and manage them."
([Personal API Keys](https://linear.app/developers/graphql#personal-api-keys))
The key is user-scoped and carries a `lin_api_` prefix
([GitHub Secret Scanning changelog](https://linear.app/changelog/2021-08-19-github-secret-scanning#github-secret-scanning)).

**OAuth2 access token** (for apps others install). Create an
[OAuth2 Application](https://linear.app/settings/api/applications/new), send the
user through `https://linear.app/oauth/authorize`, then exchange the returned
`code` at `https://api.linear.app/oauth/token` for an access token. Request only
the scopes you need — `read` (default, always present), `write`, or the
narrower `issues:create` / `comments:create`; "You should never ask for [`admin`]
permission unless it's absolutely needed." The `actor` parameter chooses whether
resources are created as the authorizing **user** (default) or as the **app**
(for agents/service accounts). Access tokens "are valid for 24 hours" and are
renewed with the paired refresh token.
([OAuth 2.0 authentication](https://linear.app/developers/oauth-2-0-authentication#redirect-user-access-requests-to-linear))

Which credential a call needs, and how the two attach differently, is in
[`linear-api-gotchas.md`](linear-api-gotchas.md#auth-personal-api-key-is-a-bare-authorization-header-no-bearer) —
the personal key goes in a **bare** `Authorization` header, OAuth tokens use
`Bearer`.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector exposes one direct-token resolver, `env`, which reads a Linear
personal API key from the `LINEAR_API_KEY` environment variable and attaches it
verbatim as the `Authorization` header (no `Bearer` prefix). Pass it as
`--connection env:LINEAR_API_KEY`.

The resolver only carries the personal-API-key identity. For Zapier-managed
connections (including OAuth), use the Zapier-managed path in
[`use-with-zapier.md`](use-with-zapier.md) instead.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
