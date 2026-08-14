# Using Microsoft OneDrive with direct credentials

This is the direct-auth path: you hold and pass Microsoft OneDrive's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

<!-- BEGIN:use-without-zapier-getting-credentials -->

OneDrive has no credential of its own — every call goes through [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive), authorized by a Microsoft Entra ID OAuth 2.0 bearer token issued for a signed-in user (delegated).

1. **Register an app.** Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com), browse to **Entra ID → App registrations → New registration**, and after registering, record the **Application (client) ID** from the app's **Overview** page. If you'll run the authorization-code flow yourself, add a redirect URI — for a system browser, `http://localhost` is an accepted value ([register an app](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app), [auth code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)).
2. **Add Microsoft Graph delegated permissions.** Under the app's **API permissions**, add the _delegated_ file scopes this connector calls. Graph's file operations accept `Files.ReadWrite` for the caller's own OneDrive, and `Files.ReadWrite.All` to reach shared or other-drive content (`findItemsByKql`, `getItemByShareUrl`, another `driveId`) — the method reference lists both under **Delegated** permissions (e.g. [download content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content#permissions): delegated `Files.ReadWrite`, `Files.ReadWrite.All`). A token that was never consented for a scope it needs fails at call time with a `403`, not at sign-in ([error responses](https://learn.microsoft.com/en-us/graph/errors)). Request `offline_access` too if you want a refresh token ([auth code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)); a new registration is also granted `User.Read` by default ([register an app](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)).
3. **Mint an access token.** Run the [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) with PKCE — direct the user to `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` with the `scope` set to the space-separated permissions from step 2, then redeem the returned `code` at `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` — or use a Microsoft-supported library ([MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)) or a signed-in tool like [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) to get one faster. The token response's `access_token` field is the credential this connector needs. It's short-lived — Microsoft issues access tokens with a [default lifetime that varies between 60 and 90 minutes](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#token-lifetime) — and in this direct mode nothing refreshes it for you, so re-mint it (or exchange the refresh token) once it expires.

<!-- END:use-without-zapier-getting-credentials -->

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

<!-- BEGIN:use-without-zapier-passing-credential -->

This connector's direct-token resolver is `env:<ENV_VAR>` — an environment variable holding the raw access token from step 3 above, e.g. `--connection env:MICROSOFT_ONEDRIVE_ACCESS_TOKEN` with that variable set to it. The token is sent as `Authorization: Bearer <token>` on every call; there is no refresh in this mode, so re-export a freshly minted token once the old one expires.
<!-- END:use-without-zapier-passing-credential -->

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
