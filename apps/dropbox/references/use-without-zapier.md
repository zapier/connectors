# Using Dropbox with direct credentials

This is the direct-auth path: you hold and pass Dropbox's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Register an app at the [App Console](https://www.dropbox.com/developers/apps) (choose **Scoped access**, then either **App folder** or **Full Dropbox** depending on how much of the account it should reach), then open its **Permissions** tab and grant the scopes the tools you'll use need — Dropbox scopes are named by object and action, e.g. `files.content.write`, `files.content.read`, `sharing.write`, `sharing.read`, `file_requests.write`, `account_info.read`. Dropbox issues a single access token per authorization — there's no separate bot/user split like some other connectors — so whichever scopes you grant gate every call that token makes; a call needing a scope you didn't grant fails with a `missing_scope` error naming the scope, and you reconnect after adding it (see [`references/dropbox-api-gotchas.md`](dropbox-api-gotchas.md)).

For quick testing against your own account only, the App Console's **OAuth 2** section has a **Generate** button that mints an access token directly, no OAuth flow required (Dropbox's own [OAuth Guide](https://developers.dropbox.com/oauth-guide) covers this, plus the full authorization-code flow needed for tokens on other users' accounts). Either way the token is short-lived — Dropbox's docs say it "will expire after a short period of time," in practice a few hours — see Passing the credential below for what that means here.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct-token resolver is `access-token:<ENV_VAR>` — it overrides the connector's default resolver name (`env`) to make explicit what it holds; the value is the name of an environment variable holding the token from above, sent as `Authorization: Bearer <token>`. It's a fallback: prefer routing through a Zapier connection ([`references/use-with-zapier.md`](use-with-zapier.md)) when you can, since **this resolver sends the token as-is and does not refresh it** — unlike the Zapier-managed path, which rotates the short-lived access token for you, a direct token just stops working once it expires (a few hours in) and you have to re-mint it (see Getting credentials above) or switch to the Zapier-managed connection.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
