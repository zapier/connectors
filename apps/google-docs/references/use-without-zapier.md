# Using Google Docs with direct credentials

This is the direct-auth path: you hold and pass Google Docs's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Register the credential in the [Google Cloud Console](https://console.cloud.google.com/), then run an OAuth 2.0 authorization flow yourself to mint an access token — this connector's direct resolver takes the token itself, not a client id/secret.

1. Create or select a project, then enable both the **Google Docs API** and the **Google Drive API** (APIs & Services → Library) — the connector calls both hosts under the one token.
2. Configure the OAuth consent screen (APIs & Services → OAuth consent screen), then create an OAuth 2.0 Client ID (APIs & Services → Credentials → Create Credentials → OAuth client ID) for whichever application type matches how you'll complete the flow (Desktop app for a local script, Web application for a redirect-based flow).
3. Run the OAuth 2.0 flow requesting the scopes the operations you need require. The full catalog needs `https://www.googleapis.com/auth/documents` (read/write document content) **plus** `https://www.googleapis.com/auth/drive` (the find / export / copy-template / folder operations act on arbitrary existing documents, which the narrower `drive.file` scope can't reach). Read-only use can request `https://www.googleapis.com/auth/documents.readonly` + `https://www.googleapis.com/auth/drive.readonly` instead — covers `getDocument` / `findDocuments` / `exportDocument`, no writes. For quick testing without writing OAuth client code, Google's [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) can mint a token against these scopes.
4. Access tokens are short-lived (Google issues them for about an hour); mint a fresh one when a call starts failing rather than assuming the credential is permanently broken. A `403 insufficient authentication scopes` response means reconnect with a token that has edit access (the scopes above); a `403 caller does not have permission` means the token itself is fine but the account it belongs to has view-only (or commenter) access to that specific document — a sharing problem, not a scope/reconnect problem.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

Google Docs's direct-token resolver is `env:<ENV_VAR>` — the value is the name of an environment variable holding the access token from above (conventionally something like `GOOGLE_DOCS_ACCESS_TOKEN`), sent as `Authorization: Bearer <token>`. The same token authorizes both the Docs and Drive hosts, so this one resolver covers every script. It's a fallback: prefer routing through a Zapier connection ([`references/use-with-zapier.md`](use-with-zapier.md)) when you can, since **this resolver does not refresh the token** — once it expires, mint a fresh one (see Getting credentials above) or switch to the Zapier-managed connection.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
