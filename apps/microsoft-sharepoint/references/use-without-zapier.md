# Using Microsoft SharePoint with direct credentials

This is the direct-auth path: you hold and pass Microsoft SharePoint's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

SharePoint has no credential of its own — every call goes through [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0), authorized by a Microsoft Entra ID (Azure AD) OAuth 2.0 bearer token.

1. **Register an app.** Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com) and go to **Identity → Applications → App registrations → New registration**. Any **supported account types** choice works for a single tenant. Note the assigned **Application (client) ID**; add a redirect URI (platform **Mobile and desktop applications**, `http://localhost` is fine for testing) if you'll run the authorization-code flow yourself rather than via a tool.
2. **Add Microsoft Graph permissions and grant admin consent.** Under **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, add the site-content scopes this connector calls: `Sites.Read.All`, `Sites.ReadWrite.All` (or `Sites.Manage.All` if you also need `createList`), and `Files.ReadWrite.All`. All of these are **admin-consent-gated** — after adding them, a tenant Global/Cloud Application Administrator must click **Grant admin consent for `<tenant>`** once; an ordinary user can't self-consent to them, and a token missing a granted scope gets a `403` at call time. `offline_access` and `User.Read` ride along as the user-consentable baseline and need no separate consent.
3. **Mint an access token.** Run the [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) (with PKCE) against `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` and `.../token`, requesting the scopes from step 2 — or use a Microsoft-supported library ([MSAL](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)) or a signed-in tool like [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) to get one faster. The token response's `access_token` field is the credential this connector needs. It's short-lived (about an hour) and, in this direct mode, nothing refreshes it for you — re-mint it once it expires.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct-token resolver is `env:<ENV_VAR>` — an environment variable holding the raw access token from step 3 above, e.g. `--connection env:<ENV_VAR>` with `<ENV_VAR>` set to it. The token is sent as `Authorization: Bearer <token>` on every call; there is no refresh in this mode, so re-export a freshly minted token once the old one expires.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
