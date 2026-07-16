# Using Microsoft Outlook with direct credentials

This is the direct-auth path: you hold and pass Microsoft Outlook's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

You need a Microsoft Graph **OAuth 2.0 delegated access token** for the signed-in mailbox — there's no API key or bot token, just a user-delegated bearer token:

1. **Register an app** in the [Microsoft Entra admin center](https://entra.microsoft.com) — **Identity** > **Applications** > **App registrations** > **New registration**. Any supported-account-type is fine as long as it covers your mailbox (work/school tenant, or "any organizational directory and personal Microsoft accounts" if you're authorizing a personal outlook.com mailbox).
2. **Add a redirect URI** under **Authentication** > **Add a platform** (pick **Mobile and desktop applications** for a script/CLI flow; `http://localhost` or the suggested `https://login.microsoftonline.com/common/oauth2/nativeclient` both work without a client secret).
3. **Grant delegated Microsoft Graph API permissions** under **API permissions** — add exactly the scopes the scripts need: `User.Read`, `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `Contacts.ReadWrite`, `MailboxSettings.Read`, plus `Mail.ReadWrite.Shared`, `Mail.Send.Shared`, and `Calendars.ReadWrite.Shared` if you'll ever pass a script's `mailbox` input to act on a shared mailbox. Add `offline_access` too if you want a refresh token (see the caveat below).
4. **Run the OAuth 2.0 authorization code flow** to get the user's consent and mint a token — see Microsoft's own walkthrough, [Get access on behalf of a user](https://learn.microsoft.com/en-us/graph/auth-v2-user): redirect the user to `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` with your `client_id`, `redirect_uri`, and the scopes from step 3, then exchange the returned `code` at `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` (`grant_type=authorization_code`) for a `token_type: Bearer` `access_token`. A Microsoft-built auth library ([MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)) or [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) can shortcut minting one for testing instead of crafting the raw HTTP calls yourself.

Access tokens are short-lived (about an hour) and this connector's direct-token resolver does **not** refresh them for you — see "Passing the credential" below. Adding a scope later requires the user to go through consent again; the granted scope set is fixed at the time they authorize, so request every scope you'll need up front.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct-token resolver is **`env:<ENV_VAR>`** — an env var (conventionally `MICROSOFT_OUTLOOK_ACCESS_TOKEN`) holding the Graph access token from above, sent as `Authorization: Bearer <token>`. There is **no token refresh in this mode** — the runner must supply a valid, unexpired token, so if you obtained a refresh token (via the `offline_access` scope) you're responsible for redeeming it and updating the env var yourself when the access token expires.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
