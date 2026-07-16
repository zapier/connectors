# Using YouTube with direct credentials

This is the direct-auth path: you hold and pass YouTube's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Register the credential in the [Google Cloud Console](https://console.cloud.google.com/), then run an OAuth 2.0 authorization flow yourself to mint an access token — this connector's direct resolver takes the token itself, not a client id/secret.

1. Create or select a project, then enable the **YouTube Data API v3** (APIs & Services → Library).
2. Configure the OAuth consent screen (APIs & Services → OAuth consent screen), then create an OAuth 2.0 Client ID (APIs & Services → Credentials → Create Credentials → OAuth client ID) for whichever application type matches how you'll complete the flow (Desktop app for a local script, Web application for a redirect-based flow).
3. Run the OAuth 2.0 flow requesting the scope(s) the scripts you'll use need — scope, not token type, is what gates what the token can do:
   - `https://www.googleapis.com/auth/youtube.readonly` — all read / list scripts (search, videos, playlists, playlist items, channels, categories, subscriptions, comment threads).
   - `https://www.googleapis.com/auth/youtube` — manage scripts: playlist create/update/delete, playlist-item add/remove, subscribe/unsubscribe, video update/delete, and rateVideo (rating does not need the comment scope).
   - `https://www.googleapis.com/auth/youtube.force-ssl` — required for all comment writes (postComment, replyToComment) and all caption operations (listCaptions, downloadCaption).

   (`SKILL.md`'s `## Auth` and [`references/youtube-api-gotchas.md`](youtube-api-gotchas.md) refer to these by their suffix — `youtube.readonly`, `youtube`, `youtube.force-ssl`.) For quick testing without writing OAuth client code, Google's [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) can mint a token against these scopes.

4. A 403 `insufficientPermissions` response means the token's scope is too narrow — mint a new one with the scope the operation needs. A 403 because you don't **own** the resource you're writing to is a different problem — a new token won't fix it (see [`references/youtube-api-gotchas.md`](youtube-api-gotchas.md) for the full error/reason table).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

YouTube's direct-token resolver is `env:<ENV_VAR>` — the value is the name of an environment variable holding the Google OAuth access token from above, sent as `Authorization: Bearer <token>`. It's a fallback: prefer routing through a Zapier connection ([`references/use-with-zapier.md`](use-with-zapier.md)) when you can, since **this resolver does not refresh the token** — Google access tokens expire ~1 hour after issue. Direct mode suits short-lived or testing use; once the token expires, mint a fresh one (see Getting credentials above) or switch to the Zapier-managed connection.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
