# Using Google Sheets with direct credentials

This is the direct-auth path: you hold and pass Google Sheets's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

The connector needs a single Google **OAuth 2.0 access token** — there's no API key or bot token for this app.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project, then enable the **Google Sheets API** (and the **Google Drive API** too, if you need `listSpreadsheets`' by-name search — otherwise pass a spreadsheet URL or id directly to the other scripts instead).
2. Configure the project's OAuth consent screen, then create an **OAuth 2.0 Client ID** (Google Cloud Console → APIs & Services → Credentials).
3. Run the standard OAuth 2.0 authorization-code flow for that client, granting the scopes below, to mint an access token. This connector's direct/`env` mode does not refresh anything for you, so for a quick token to test with, Google's [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) can mint one against your own client without writing any code: pick the scope(s), authorize, and copy the resulting access token.

Request only the scopes you need:

- **`https://www.googleapis.com/auth/spreadsheets`** — read/write access to spreadsheet content; required for every script except `listSpreadsheets`.
- **`https://www.googleapis.com/auth/drive.file`** — lets `createSpreadsheet` (and any script that opens a spreadsheet it created) work, scoped only to files this app touches; Google's recommended, non-sensitive Drive scope.
- **`https://www.googleapis.com/auth/drive.readonly`** (or the broader `https://www.googleapis.com/auth/drive`) — needed only for `listSpreadsheets`, which searches Drive by name; skip it if you always address spreadsheets by URL/id.

**Google access tokens expire ~1 hour after issue, and this connector's direct/`env` mode does not auto-refresh them** — fine for short testing sessions, but for anything long-running use [`references/use-with-zapier.md`](use-with-zapier.md)'s Zapier-managed connection instead, which keeps the token refreshed for you.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's only direct resolver is `env:<ENV_VAR>` — set `<ENV_VAR>` to any environment variable name you like holding the raw access token (e.g. `export GOOGLE_SHEETS_ACCESS_TOKEN=xxx`), then pass `--connection env:GOOGLE_SHEETS_ACCESS_TOKEN` (or `{ connection: "env:GOOGLE_SHEETS_ACCESS_TOKEN" }` for the SDK), naming the same variable. The token is sent as `Authorization: Bearer <token>`.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
