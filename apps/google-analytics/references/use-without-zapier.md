# Using Google Analytics with direct credentials

This is the direct-auth path: you hold and pass Google Analytics's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

The credential is a **Google OAuth 2.0 access token** — the same bearer token the Zapier-managed connection carries, minted yourself. To produce one:

1. In the [Google Cloud console](https://console.cloud.google.com/), create (or reuse) a project and enable the **Google Analytics Admin API** and **Google Analytics Data API**.
2. Under **APIs & Services → Credentials**, create an **OAuth 2.0 Client ID** and configure the consent screen.
3. Run the OAuth flow (e.g. the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)) for a Google account with access to the target GA4 property, authorizing the scopes below, and copy the resulting **access token**.

Required scopes:

- **Read tools** (`runReport`, `getMetadata`, `listAccountSummaries`, …) accept either `https://www.googleapis.com/auth/analytics.readonly` or `https://www.googleapis.com/auth/analytics`.
- **Write tools** (create/patch/archive key events and custom dimensions/metrics, create a Measurement Protocol secret) require `https://www.googleapis.com/auth/analytics.edit`. Authorize `analytics.readonly` **and** `analytics.edit` (or the full `analytics` scope) for a token that works across every tool; a read-only token makes the write tools return `PERMISSION_DENIED`.

`sendEvent` is the exception — it authenticates with a per-stream Measurement Protocol `apiSecret` (passed as a tool input), not this OAuth token.

**Google access tokens are short-lived (~1 hour) and this direct path does not refresh them** — it suits short-lived/testing use. For anything long-running, route through the Zapier-managed connection (see [`references/use-with-zapier.md`](use-with-zapier.md)), which refreshes automatically.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct-token resolver is `env:GOOGLE_ANALYTICS_ACCESS_TOKEN` — the value is the environment-variable NAME, not the token itself. Export the access token in `GOOGLE_ANALYTICS_ACCESS_TOKEN` and pass `--connection env:GOOGLE_ANALYTICS_ACCESS_TOKEN` (or `{ connection: "env:GOOGLE_ANALYTICS_ACCESS_TOKEN" }` for imported functions). The connector sends it as `Authorization: Bearer <token>`.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
