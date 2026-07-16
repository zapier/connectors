# Using Google Ads with direct credentials

This is the direct-auth path: you hold and pass Google Ads's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Google Ads requires **two** credentials together: a Google OAuth 2.0 access token authorized for the `adwords` scope, and a separate Google Ads API **developer token**. Both are needed on every request; neither alone is enough.

**OAuth access token** (scope `https://www.googleapis.com/auth/adwords`):

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project, then enable the Google Ads API (APIs & Services → Library → search "Google Ads API" → Enable).
2. Configure the OAuth consent screen and add the `.../auth/adwords` scope to it.
3. Create an OAuth 2.0 Client ID (Credentials → Create Credentials → OAuth client ID). Application type **Desktop app** is simplest for a one-time authorization run; download the client id/secret.
4. Authorize as a Google user who has access to the target Ads account(s). With the `gcloud` CLI, for example:
   ```bash
   gcloud auth application-default login \
     --scopes=https://www.googleapis.com/auth/adwords \
     --client-id-file=credentials.json
   ```
   This opens a browser for consent and, on success, writes a refresh token (plus the client id/secret) to `application_default_credentials.json`.
5. Exchange the refresh token for a short-lived access token — Google Ads API access tokens expire in about an hour, and this connector does **not** refresh them for you:
   ```bash
   curl --data "grant_type=refresh_token" \
     --data "client_id=$CLIENT_ID" \
     --data "client_secret=$CLIENT_SECRET" \
     --data "refresh_token=$REFRESH_TOKEN" \
     https://www.googleapis.com/oauth2/v3/token
   ```
   Repeat this step to mint a fresh access token whenever the previous one expires.

**Developer token**: sign in to a Google Ads **manager (MCC)** account — not a regular client account — and open **Tools & Settings → Setup → API Center** ([ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter)). Submit the API access form to get a token. A newly issued token starts at **test-account** access (only works against Google Ads test accounts) or, if auto-approved, **Basic/Explorer** access; using it against your real production accounts needs Basic or Standard access, which requires applying and passing Google's review — start that process well before you need it, since review can take a while.

See Google's own walkthroughs for details: [set up OAuth](https://developers.google.com/google-ads/api/docs/oauth/cloud-project), [generate a refresh token](https://developers.google.com/google-ads/api/docs/oauth/client-library), and [obtain a developer token](https://developers.google.com/google-ads/api/docs/get-started/dev-token).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct resolver is a **prefix**, not a single token, because both credentials above must be supplied together: `env:<ENV_VAR_PREFIX>` reads `<ENV_VAR_PREFIX>_ACCESS_TOKEN` (the OAuth access token) and `<ENV_VAR_PREFIX>_DEVELOPER_TOKEN` (the developer token). For example, with the prefix `GOOGLE_ADS`:

```bash
export GOOGLE_ADS_ACCESS_TOKEN=xxx GOOGLE_ADS_DEVELOPER_TOKEN=yyy
# --connection env:GOOGLE_ADS
```

The access token is used as-is and is **not** refreshed — supply a fresh one (see "Getting credentials" above) before it expires.

The per-request `loginCustomerId` input (the manager account, when operating through a manager) is not part of either credential — it's request context passed on the tool call, not the connection string.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
